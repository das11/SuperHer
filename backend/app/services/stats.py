from sqlalchemy import func, case, select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.models.customer_event import CustomerEvent, EventType
from app.models.click_event import ClickEvent
from app.models.influencer import Influencer, CampaignInfluencer
from app.models.campaign import Campaign
from app.models.tracking_link import TrackingLink

class StatsService:
    @staticmethod
    def apply_filters(query, model, start_date: Optional[datetime], end_date: Optional[datetime], campaign_id: Optional[int] = None, influencer_id: Optional[int] = None):
        if start_date:
            query = query.where(model.timestamp >= start_date)
        if end_date:
            query = query.where(model.timestamp <= end_date)
        if campaign_id:
            query = query.where(model.campaign_id == campaign_id)
        if influencer_id:
            query = query.where(model.influencer_id == influencer_id)
        return query

    @staticmethod
    async def get_overview(
        db: AsyncSession, 
        advertiser_id: Optional[int], 
        start_date: Optional[datetime] = None, 
        end_date: Optional[datetime] = None,
        campaign_id: Optional[int] = None,
        influencer_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Returns high-level stats: Total Clicks, Conversions, GMV, Conversion Rate.
        """
        try:
            # 1. Total Clicks
            from app.models.tracking_link import TrackingLink
            clicks_stmt = select(func.count(ClickEvent.id)).join(TrackingLink, ClickEvent.tracking_link_id == TrackingLink.id).join(Campaign, TrackingLink.campaign_id == Campaign.id)
            
            if advertiser_id:
                clicks_stmt = clicks_stmt.where(Campaign.advertiser_id == advertiser_id)
            
            # Apply filters to ClickEvent (Link via TrackingLink)
            if start_date:
                clicks_stmt = clicks_stmt.where(ClickEvent.timestamp >= start_date)
            if end_date:
                clicks_stmt = clicks_stmt.where(ClickEvent.timestamp <= end_date)
            if campaign_id:
                clicks_stmt = clicks_stmt.where(TrackingLink.campaign_id == campaign_id)
            if influencer_id:
                clicks_stmt = clicks_stmt.where(TrackingLink.influencer_id == influencer_id)
                
            total_clicks_res = await db.execute(clicks_stmt)
            total_clicks = total_clicks_res.scalar_one() or 0

            # 2. Aggregates from CustomerEvent (Conversions & Revenue)
            base_query = select(
                func.count(CustomerEvent.id).label("total_events"),
                func.sum(case((CustomerEvent.event_type == EventType.purchase, 1), else_=0)).label("total_conversions"),
                func.sum(case((CustomerEvent.event_type == EventType.purchase, CustomerEvent.revenue), else_=0)).label("total_revenue"),
                func.sum(
                    case((CustomerEvent.event_type == EventType.purchase,
                         case(
                             (CampaignInfluencer.revenue_share_type == 'percentage', 
                              func.coalesce(CustomerEvent.revenue, 0) * func.coalesce(CampaignInfluencer.revenue_share_value, 0) / 100.0),
                             (CampaignInfluencer.revenue_share_type == 'flat', 
                              func.coalesce(CampaignInfluencer.revenue_share_value, 0)),
                             else_=0.0
                         )
                    ), else_=0.0)
                ).label("total_payout")
            )
            
            # Join CampaignInfluencer to get revenue share details
            # We need a left join because not all events will have a corresponding influencer share setup
            base_query = base_query.outerjoin(
                CampaignInfluencer, 
                (CampaignInfluencer.campaign_id == CustomerEvent.campaign_id) & 
                (CampaignInfluencer.influencer_id == CustomerEvent.influencer_id)
            )
            
            if advertiser_id:
                base_query = base_query.where(CustomerEvent.advertiser_id == advertiser_id)

            base_query = StatsService.apply_filters(base_query, CustomerEvent, start_date, end_date, campaign_id, influencer_id)
            
            result = await db.execute(base_query)
            row = result.one()
            
            total_conversions = row.total_conversions or 0
            total_revenue = row.total_revenue or 0.0
            
            # Calc Rate
            conv_rate = (total_conversions / total_clicks * 100) if total_clicks > 0 else 0.0

            return {
                "total_clicks": total_clicks,
                "total_conversions": total_conversions,
                "total_revenue": total_revenue,
                "total_payout": row.total_payout or 0.0,
                "conversion_rate": round(conv_rate, 2)
            }
        except Exception as e:
            import traceback
            print(traceback.format_exc())
            from fastapi import HTTPException
            raise HTTPException(status_code=500, detail=f"Stats Error: {str(e)}")

    @staticmethod
    async def get_chart_data(
        db: AsyncSession,
        advertiser_id: Optional[int],
        start_date: Optional[datetime],
        end_date: Optional[datetime],
        campaign_id: Optional[int] = None,
        influencer_id: Optional[int] = None
    ):
        """
        Returns daily breakdown of Clicks vs Conversions vs Revenue.
        """
        try:
            # Query A: Daily Clicks
            from app.models.tracking_link import TrackingLink
            
            clicks_stmt = select(
                func.date(ClickEvent.timestamp).label("date"),
                func.count(ClickEvent.id).label("clicks")
            ).join(TrackingLink, ClickEvent.tracking_link_id == TrackingLink.id).join(Campaign, TrackingLink.campaign_id == Campaign.id)
            
            if advertiser_id:
                clicks_stmt = clicks_stmt.where(Campaign.advertiser_id == advertiser_id)

            if start_date:
                clicks_stmt = clicks_stmt.where(ClickEvent.timestamp >= start_date)
            if end_date:
                clicks_stmt = clicks_stmt.where(ClickEvent.timestamp <= end_date)
            if campaign_id:
                clicks_stmt = clicks_stmt.where(TrackingLink.campaign_id == campaign_id)
            if influencer_id:
                clicks_stmt = clicks_stmt.where(TrackingLink.influencer_id == influencer_id)
                
            clicks_stmt = clicks_stmt.group_by(func.date(ClickEvent.timestamp)).order_by(func.date(ClickEvent.timestamp))
            
            # Query B: Daily Events
            events_stmt = select(
                func.date(CustomerEvent.timestamp).label("date"),
                func.sum(case((CustomerEvent.event_type == EventType.purchase, 1), else_=0)).label("purchases"),
                func.sum(case((CustomerEvent.event_type == EventType.add_to_cart, 1), else_=0)).label("atc"),
                func.sum(case((CustomerEvent.event_type == EventType.purchase, CustomerEvent.revenue), else_=0)).label("revenue")
            )
            
            if advertiser_id:
                events_stmt = events_stmt.where(CustomerEvent.advertiser_id == advertiser_id)

            events_stmt = StatsService.apply_filters(events_stmt, CustomerEvent, start_date, end_date, campaign_id, influencer_id)
            events_stmt = events_stmt.group_by(func.date(CustomerEvent.timestamp)).order_by(func.date(CustomerEvent.timestamp))

            # Execute
            clicks_res = await db.execute(clicks_stmt)
            events_res = await db.execute(events_stmt)
            
            # Merge Results
            data_map = {}
            
            for date_obj, count in clicks_res:
                d_str = str(date_obj)
                if d_str not in data_map: data_map[d_str] = {"date": d_str, "clicks": 0, "purchases": 0, "atc": 0, "revenue": 0}
                data_map[d_str]["clicks"] = count
                
            for date_obj, purchases, atc, revenue in events_res:
                d_str = str(date_obj)
                if d_str not in data_map: data_map[d_str] = {"date": d_str, "clicks": 0, "purchases": 0, "atc": 0, "revenue": 0}
                data_map[d_str]["purchases"] = purchases or 0
                data_map[d_str]["atc"] = atc or 0
                data_map[d_str]["revenue"] = revenue or 0.0
                
            # Return sorted list
            return sorted(data_map.values(), key=lambda x: x["date"])
        except Exception as e:
            import traceback
            print(traceback.format_exc())
            from fastapi import HTTPException
            raise HTTPException(status_code=500, detail=f"Chart Stats Error: {str(e)}")

    @staticmethod
    async def get_top_influencers(
        db: AsyncSession,
        advertiser_id: Optional[int],
        limit: int = 10,
        campaign_id: Optional[int] = None,
        influencer_id: Optional[int] = None
    ):
        """
        Returns top influencers by revenue.
        """
        try:
            # We need to aggregate events grouped by Influencer
            # Join CustomerEvent -> Influencer
            stmt = select(
                Influencer.name,
                Influencer.social_handle,
                func.count(CustomerEvent.id).label("total_events"),
                func.sum(case((CustomerEvent.event_type == EventType.purchase, 1), else_=0)).label("purchases"),
                func.sum(case((CustomerEvent.event_type == EventType.purchase, CustomerEvent.revenue), else_=0)).label("revenue"),
                func.sum(
                    case((CustomerEvent.event_type == EventType.purchase,
                         case(
                             (CampaignInfluencer.revenue_share_type == 'percentage', 
                              func.coalesce(CustomerEvent.revenue, 0) * func.coalesce(CampaignInfluencer.revenue_share_value, 0) / 100.0),
                             (CampaignInfluencer.revenue_share_type == 'flat', 
                              func.coalesce(CampaignInfluencer.revenue_share_value, 0)),
                             else_=0.0
                         )
                    ), else_=0.0)
                ).label("payout")
            ).join(Influencer, CustomerEvent.influencer_id == Influencer.id)\
             .outerjoin(
                CampaignInfluencer, 
                (CampaignInfluencer.campaign_id == CustomerEvent.campaign_id) & 
                (CampaignInfluencer.influencer_id == CustomerEvent.influencer_id)
            )
            
            if advertiser_id:
                stmt = stmt.where(CustomerEvent.advertiser_id == advertiser_id)
                
            if campaign_id:
                stmt = stmt.where(CustomerEvent.campaign_id == campaign_id)
            if influencer_id:
                stmt = stmt.where(Influencer.id == influencer_id)
                
            stmt = stmt.group_by(Influencer.name, Influencer.social_handle).order_by(desc("revenue")).limit(limit)
            
            result = await db.execute(stmt)
            return [
                {
                    "name": row.name,
                    "handle": row.social_handle,
                    "events": row.total_events,
                    "purchases": row.purchases,
                    "revenue": row.revenue or 0.0,
                    "payout": row.payout or 0.0
                }
                for row in result
            ]
        except Exception as e:
            import traceback
            print(traceback.format_exc())
            from fastapi import HTTPException
            raise HTTPException(status_code=500, detail=f"Influencer Stats Error: {str(e)}")

    @staticmethod
    async def get_top_campaigns(
        db: AsyncSession,
        advertiser_id: Optional[int],
        limit: int = 10,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        campaign_id: Optional[int] = None,
        influencer_id: Optional[int] = None
    ):
        """
        Returns top campaigns by revenue.
        """
        try:
            stmt = select(
                Campaign.name,
                Campaign.status,
                func.count(CustomerEvent.id).label("events"),
                func.sum(case((CustomerEvent.event_type == EventType.purchase, 1), else_=0)).label("purchases"),
                func.sum(CustomerEvent.revenue).label("revenue"),
                func.sum(
                    case((CustomerEvent.event_type == EventType.purchase,
                         case(
                             (CampaignInfluencer.revenue_share_type == 'percentage', 
                              func.coalesce(CustomerEvent.revenue, 0) * func.coalesce(CampaignInfluencer.revenue_share_value, 0) / 100.0),
                             (CampaignInfluencer.revenue_share_type == 'flat', 
                              func.coalesce(CampaignInfluencer.revenue_share_value, 0)),
                             else_=0.0
                         )
                    ), else_=0.0)
                ).label("payout")
            )

            join_condition = (CustomerEvent.campaign_id == Campaign.id)
            if advertiser_id:
                 join_condition = join_condition & (CustomerEvent.advertiser_id == advertiser_id)
                
            stmt = stmt.outerjoin(CustomerEvent, join_condition)\
                       .outerjoin(
                            CampaignInfluencer, 
                            (CampaignInfluencer.campaign_id == Campaign.id) & 
                            (CampaignInfluencer.influencer_id == CustomerEvent.influencer_id)
                        )

            if advertiser_id:
                stmt = stmt.where(Campaign.advertiser_id == advertiser_id)
            
            # Apply filters to CustomerEvent relation if needed
            if start_date:
                stmt = stmt.where(CustomerEvent.timestamp >= start_date)
            if end_date:
                stmt = stmt.where(CustomerEvent.timestamp <= end_date)
                
            # Campaign/Influencer filters
            if campaign_id:
                stmt = stmt.where(Campaign.id == campaign_id)
            if influencer_id:
                stmt = stmt.where(CustomerEvent.influencer_id == influencer_id)
                
            stmt = stmt.group_by(Campaign.name, Campaign.status).order_by(desc("revenue")).limit(limit)
            
            result = await db.execute(stmt)
            return [
                {
                    "name": row.name, 
                    "status": row.status.value if hasattr(row.status, 'value') else row.status,
                    "events": row.events,
                    "purchases": row.purchases,
                    "revenue": row.revenue or 0.0,
                    "payout": row.payout or 0.0
                } 
                for row in result
            ]
        except Exception as e:
            import traceback
            print(traceback.format_exc())
            from fastapi import HTTPException
            raise HTTPException(status_code=500, detail=f"Campaign Stats Error: {str(e)}")

    @staticmethod
    async def get_top_coupons(
        db: AsyncSession,
        advertiser_id: Optional[int],
        limit: int = 10,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        campaign_id: Optional[int] = None,
        influencer_id: Optional[int] = None
    ):
        """
        Returns stats aggregated by Coupon Code.
        """
        try:
            stmt = select(
                CustomerEvent.coupon_code,
                func.count(CustomerEvent.id).label("total_events"),
                func.sum(case((CustomerEvent.event_type == EventType.purchase, 1), else_=0)).label("purchases"),
                func.sum(case((CustomerEvent.event_type == EventType.purchase, CustomerEvent.revenue), else_=0)).label("revenue")
            )
            
            if advertiser_id:
                stmt = stmt.where(CustomerEvent.advertiser_id == advertiser_id)
            
            stmt = stmt.where(CustomerEvent.coupon_code.isnot(None))
                 
            stmt = StatsService.apply_filters(stmt, CustomerEvent, start_date, end_date, campaign_id, influencer_id)
            
            stmt = stmt.group_by(CustomerEvent.coupon_code).order_by(desc("revenue")).limit(limit)
            
            result = await db.execute(stmt)
            return [
                {
                    "code": row.coupon_code,
                    "events": row.total_events,
                    "purchases": row.purchases,
                    "revenue": row.revenue or 0.0
                }
                for row in result
            ]
        except Exception as e:
            import traceback
            print(traceback.format_exc())
            from fastapi import HTTPException
            raise HTTPException(status_code=500, detail=f"Coupon Stats Error: {str(e)}")

    @staticmethod
    async def get_top_links(
        db: AsyncSession,
        advertiser_id: Optional[int],
        limit: int = 10,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        campaign_id: Optional[int] = None,
        influencer_id: Optional[int] = None
    ):
        """
        Returns stats aggregated by Tracking Link (Short Code).
        """
        try:            
            # 1. Get Top Links by Revenue/Events
            # We want ALL links for this advertiser (or all if global).
            stmt = select(
                TrackingLink.id,
                TrackingLink.short_code,
                TrackingLink.destination_url,
                func.count(CustomerEvent.id).label("total_events"),
                func.sum(case((CustomerEvent.event_type == EventType.purchase, 1), else_=0)).label("purchases"),
                func.sum(case((CustomerEvent.event_type == EventType.purchase, CustomerEvent.revenue), else_=0)).label("revenue")
            ).join(Campaign, TrackingLink.campaign_id == Campaign.id)
            
            join_condition = (CustomerEvent.tracking_link_id == TrackingLink.id)
            if advertiser_id:
                join_condition = join_condition & (CustomerEvent.advertiser_id == advertiser_id)
                stmt = stmt.where(Campaign.advertiser_id == advertiser_id)
            
            stmt = stmt.outerjoin(CustomerEvent, join_condition)
             
            # Filters
            if start_date:
                stmt = stmt.where((CustomerEvent.timestamp >= start_date) | (CustomerEvent.id.is_(None)))
            if end_date:
                stmt = stmt.where((CustomerEvent.timestamp <= end_date) | (CustomerEvent.id.is_(None)))
            
            if campaign_id:
                stmt = stmt.where(TrackingLink.campaign_id == campaign_id)
            if influencer_id:
                stmt = stmt.where(TrackingLink.influencer_id == influencer_id)
            
            stmt = stmt.group_by(TrackingLink.id, TrackingLink.short_code, TrackingLink.destination_url)\
             .order_by(desc("revenue"))\
             .limit(limit)
             
            result = await db.execute(stmt)
            rows = result.all()
            
            if not rows:
                return []
                
            # 2. Extract IDs for Click Counting
            link_ids = [r.id for r in rows]
            data_map = {
                r.id: {
                    "short_code": r.short_code,
                    "url": r.destination_url,
                    "total_events": r.total_events,
                    "purchases": r.purchases,
                    "revenue": r.revenue or 0.0,
                    "clicks": 0 # Default
                } for r in rows
            }
            
            # 3. Query Clicks for these links
            click_stmt = select(
                ClickEvent.tracking_link_id,
                func.count(ClickEvent.id).label("clicks")
            ).where(ClickEvent.tracking_link_id.in_(link_ids))
            
            if start_date:
                click_stmt = click_stmt.where(ClickEvent.timestamp >= start_date)
            if end_date:
                click_stmt = click_stmt.where(ClickEvent.timestamp <= end_date)
            
            click_stmt = click_stmt.group_by(ClickEvent.tracking_link_id)
            
            click_res = await db.execute(click_stmt)
            for cid, count in click_res:
                if cid in data_map:
                    data_map[cid]["clicks"] = count
            
            return list(data_map.values())

        except Exception as e:
            import traceback
            print(traceback.format_exc())
            from fastapi import HTTPException
            raise HTTPException(status_code=500, detail=f"Link Stats Error: {str(e)}")

    @staticmethod
    async def export_events_csv(
        db: AsyncSession,
        advertiser_id: Optional[int],
        start_date: Optional[datetime],
        end_date: Optional[datetime],
        campaign_id: Optional[int] = None,
        influencer_id: Optional[int] = None
    ):
        """
        Generates a CSV generator for all events.
        """
        import csv
        import io
        
        # Define CSV Headers
        headers = ["Event ID", "Date", "Type", "Ref Code", "Coupon", "Revenue", "Influencer", "Campaign"]
        
        # Yield BOM for Excel
        yield "\ufeff"
        
        # Yield Header
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(headers)
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)
        
        # Query Data
        stmt = select(
            CustomerEvent.id,
            CustomerEvent.timestamp,
            CustomerEvent.event_type,
            CustomerEvent.ref_code,
            CustomerEvent.coupon_code,
            CustomerEvent.revenue,
            Influencer.name.label("influencer_name"),
            Campaign.name.label("campaign_name")
        ).outerjoin(Influencer, CustomerEvent.influencer_id == Influencer.id)\
         .outerjoin(Campaign, CustomerEvent.campaign_id == Campaign.id)
         
        if advertiser_id:
            stmt = stmt.where(CustomerEvent.advertiser_id == advertiser_id)

        stmt = StatsService.apply_filters(stmt, CustomerEvent, start_date, end_date, campaign_id, influencer_id)
        stmt = stmt.order_by(desc(CustomerEvent.timestamp))
        
        # Stream results
        # Note: In async sqlalchemy, we stream using `await db.stream(stmt)`
        result = await db.stream(stmt)
        
        async for row in result:
            # row is a Row object
            writer.writerow([
                row.id,
                row.timestamp.isoformat() if row.timestamp else "",
                row.event_type,
                row.ref_code or "",
                row.coupon_code or "",
                row.revenue or 0.0,
                row.influencer_name or "Unattributed",
                row.campaign_name or ""
            ])
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

    @staticmethod
    async def get_event_breakdown(
        db: AsyncSession,
        advertiser_id: Optional[int],
        start_date: Optional[datetime],
        end_date: Optional[datetime],
        campaign_id: Optional[int] = None,
        influencer_id: Optional[int] = None
    ):
        """
        Returns count of events grouped by Event Type.
        Useful for Sankey/Funnel charts.
        """
        try:
            # Aggregate by Event Type
            stmt = select(
                CustomerEvent.event_type,
                func.count(CustomerEvent.id).label("count")
            )
            
            if advertiser_id:
                stmt = stmt.where(CustomerEvent.advertiser_id == advertiser_id)

            stmt = StatsService.apply_filters(stmt, CustomerEvent, start_date, end_date, campaign_id, influencer_id)
            stmt = stmt.group_by(CustomerEvent.event_type)
            
            result = await db.execute(stmt)
            
            # Helper map for prettier keys if needed, but returning raw types is fine
            data = {row.event_type: row.count for row in result}
            
            # Ensure we return at least zeros for known types if needed, or just return what we have
            return [
                {"name": k, "value": v} for k, v in data.items()
            ]
        except Exception as e:
            import traceback
            print(traceback.format_exc())
            from fastapi import HTTPException
            raise HTTPException(status_code=500, detail=f"Breakdown Stats Error: {str(e)}")

    @staticmethod
    async def get_journey_stats(
        db: AsyncSession,
        advertiser_id: Optional[int],
        start_date: Optional[datetime],
        end_date: Optional[datetime],
        campaign_id: Optional[int] = None,
        influencer_id: Optional[int] = None
    ):
        """
        Returns data for Attribution Flow Sankey Chart.
        Grouping: Source (Link/Direct) -> Method (Coupon/Ref) -> Outcome (Event Type)
        """
        try:
            # We want to group by:
            # 1. Source: Has tracking_link_id?
            # 2. Method: Has coupon_code? Has ref_code?
            # 3. Outcome: event_type
            
            # Using case statements to create labels
            # Note: In SQLAlchemy 1.4/2.0+ async, we might need to be careful with complex labels in group_by
            # But simple case maps should work in the select.
            
            source_case = case(
                (CustomerEvent.tracking_link_id.isnot(None), "Tracking Link"),
                else_="Direct / Organic"
            ).label("source")
            
            method_case = case(
                (CustomerEvent.coupon_code.isnot(None), "Coupon Code"),
                (CustomerEvent.ref_code.isnot(None), "Ref Code"),
                else_="Unattributed"
            ).label("method")
            
            stmt = select(
                source_case,
                method_case,
                CustomerEvent.event_type,
                func.count(CustomerEvent.id).label("count")
            )
            
            if advertiser_id:
                stmt = stmt.where(CustomerEvent.advertiser_id == advertiser_id)
            
            stmt = StatsService.apply_filters(stmt, CustomerEvent, start_date, end_date, campaign_id, influencer_id)
            
            stmt = stmt.group_by("source", "method", CustomerEvent.event_type)
            
            result = await db.execute(stmt)
            
            data = []
            for row in result:
                data.append({
                    "source": row.source,
                    "method": row.method,
                    "event_type": row.event_type,
                    "count": row.count
                })
                
            return data

        except Exception as e:
            import traceback
            print(traceback.format_exc())
            from fastapi import HTTPException
            raise HTTPException(status_code=500, detail=f"Journey Stats Error: {str(e)}")
