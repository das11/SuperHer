"""
Forecast Service — Holt-Winters Exponential Smoothing
Generates traffic (clicks) and sales (purchases) forecasts
with confidence bands based on historical daily data.
"""

import numpy as np
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy import func, case, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer_event import CustomerEvent, EventType
from app.models.click_event import ClickEvent
from app.models.tracking_link import TrackingLink
from app.models.campaign import Campaign

MIN_DATA_POINTS = 14  # Minimum days required for forecasting


class ForecastService:

    @staticmethod
    async def _get_daily_series(
        db: AsyncSession,
        advertiser_id: Optional[int],
    ) -> List[Dict[str, Any]]:
        """
        Fetches daily clicks and purchases for the given advertiser.
        Returns a sorted list of { date, clicks, purchases }.
        """
        # Query A: Daily Clicks
        clicks_stmt = (
            select(
                func.date(ClickEvent.timestamp).label("date"),
                func.count(ClickEvent.id).label("clicks"),
            )
            .join(TrackingLink, ClickEvent.tracking_link_id == TrackingLink.id)
            .join(Campaign, TrackingLink.campaign_id == Campaign.id)
        )
        if advertiser_id:
            clicks_stmt = clicks_stmt.where(Campaign.advertiser_id == advertiser_id)
        clicks_stmt = clicks_stmt.group_by(func.date(ClickEvent.timestamp)).order_by(
            func.date(ClickEvent.timestamp)
        )

        # Query B: Daily Events (purchases)
        events_stmt = select(
            func.date(CustomerEvent.timestamp).label("date"),
            func.sum(
                case((CustomerEvent.event_type == EventType.purchase, 1), else_=0)
            ).label("purchases"),
        )
        if advertiser_id:
            events_stmt = events_stmt.where(
                CustomerEvent.advertiser_id == advertiser_id
            )
        events_stmt = events_stmt.group_by(
            func.date(CustomerEvent.timestamp)
        ).order_by(func.date(CustomerEvent.timestamp))

        # Execute
        clicks_res = await db.execute(clicks_stmt)
        events_res = await db.execute(events_stmt)

        # Merge into a date-keyed map
        data_map: Dict[str, Dict[str, Any]] = {}

        for date_obj, count in clicks_res:
            d_str = str(date_obj)
            if d_str not in data_map:
                data_map[d_str] = {"date": d_str, "clicks": 0, "purchases": 0}
            data_map[d_str]["clicks"] = count

        for date_obj, purchases in events_res:
            d_str = str(date_obj)
            if d_str not in data_map:
                data_map[d_str] = {"date": d_str, "clicks": 0, "purchases": 0}
            data_map[d_str]["purchases"] = purchases or 0

        # Sort by date and fill gaps
        if not data_map:
            return []

        sorted_dates = sorted(data_map.keys())
        start = datetime.strptime(sorted_dates[0], "%Y-%m-%d")
        end = datetime.strptime(sorted_dates[-1], "%Y-%m-%d")

        filled = []
        current = start
        while current <= end:
            d_str = current.strftime("%Y-%m-%d")
            if d_str in data_map:
                filled.append(data_map[d_str])
            else:
                filled.append({"date": d_str, "clicks": 0, "purchases": 0})
            current += timedelta(days=1)

        return filled

    @staticmethod
    def _run_holt_winters(series: List[float], days_ahead: int) -> Dict[str, Any]:
        """
        Runs Holt-Winters on a 1D numeric series.
        Returns forecast values and confidence bands.
        """
        from statsmodels.tsa.holtwinters import ExponentialSmoothing

        arr = np.array(series, dtype=float)

        # Ensure no negative values (floor at 0)
        arr = np.maximum(arr, 0)

        # If the series is constant (all zeros or all same), use simple mean
        if np.std(arr) == 0:
            mean_val = float(np.mean(arr))
            forecast_vals = [mean_val] * days_ahead
            return {
                "forecast": forecast_vals,
                "upper": forecast_vals,
                "lower": [max(0, v) for v in forecast_vals],
            }

        try:
            model = ExponentialSmoothing(
                arr,
                trend="add",
                seasonal=None,
                damped_trend=True,
            ).fit(optimized=True)

            # Forecast
            forecast_vals = model.forecast(days_ahead)

            # Confidence bands via residual std
            residuals = arr - model.fittedvalues
            residual_std = float(np.std(residuals))

            upper = forecast_vals + 1.96 * residual_std
            lower = forecast_vals - 1.96 * residual_std

            return {
                "forecast": [max(0, float(v)) for v in forecast_vals],
                "upper": [max(0, float(v)) for v in upper],
                "lower": [max(0, float(v)) for v in lower],
            }

        except Exception:
            # Fallback: simple linear extrapolation
            x = np.arange(len(arr))
            coeffs = np.polyfit(x, arr, 1)
            future_x = np.arange(len(arr), len(arr) + days_ahead)
            forecast_vals = np.polyval(coeffs, future_x)

            residual_std = float(np.std(arr - np.polyval(coeffs, x)))
            upper = forecast_vals + 1.96 * residual_std
            lower = forecast_vals - 1.96 * residual_std

            return {
                "forecast": [max(0, float(v)) for v in forecast_vals],
                "upper": [max(0, float(v)) for v in upper],
                "lower": [max(0, float(v)) for v in lower],
            }

    @staticmethod
    async def get_forecast(
        db: AsyncSession,
        advertiser_id: Optional[int],
        days_ahead: int = 30,
    ) -> Dict[str, Any]:
        """
        Main entry point. Returns historical data + forecast + confidence bands.
        If insufficient data, returns a warning payload.
        """
        try:
            daily = await ForecastService._get_daily_series(db, advertiser_id)

            # --- Sufficiency Check ---
            if len(daily) < MIN_DATA_POINTS:
                return {
                    "sufficient": False,
                    "message": (
                        f"At least {MIN_DATA_POINTS} days of historical data required "
                        f"for forecasting. Currently tracking {len(daily)} day(s)."
                    ),
                    "data_points": len(daily),
                    "min_required": MIN_DATA_POINTS,
                    "historical": daily,
                    "forecast": [],
                    "confidence": [],
                }

            # --- Extract series ---
            clicks_series = [d["clicks"] for d in daily]
            purchases_series = [d["purchases"] for d in daily]

            # --- Run Forecast ---
            clicks_fc = ForecastService._run_holt_winters(clicks_series, days_ahead)
            purchases_fc = ForecastService._run_holt_winters(
                purchases_series, days_ahead
            )

            # --- Build forecast dates ---
            last_date = datetime.strptime(daily[-1]["date"], "%Y-%m-%d")
            forecast_dates = [
                (last_date + timedelta(days=i + 1)).strftime("%Y-%m-%d")
                for i in range(days_ahead)
            ]

            forecast_data = []
            confidence_data = []
            for i, d in enumerate(forecast_dates):
                forecast_data.append(
                    {
                        "date": d,
                        "clicks": round(clicks_fc["forecast"][i], 1),
                        "purchases": round(purchases_fc["forecast"][i], 1),
                    }
                )
                confidence_data.append(
                    {
                        "date": d,
                        "clicks_upper": round(clicks_fc["upper"][i], 1),
                        "clicks_lower": round(clicks_fc["lower"][i], 1),
                        "purchases_upper": round(purchases_fc["upper"][i], 1),
                        "purchases_lower": round(purchases_fc["lower"][i], 1),
                    }
                )

            return {
                "sufficient": True,
                "data_points": len(daily),
                "days_ahead": days_ahead,
                "historical": daily,
                "forecast": forecast_data,
                "confidence": confidence_data,
            }

        except Exception as e:
            import traceback

            print(traceback.format_exc())
            return {
                "sufficient": False,
                "message": f"Forecast computation error: {str(e)}",
                "data_points": 0,
                "historical": [],
                "forecast": [],
                "confidence": [],
            }
