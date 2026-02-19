import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
    ComposedChart, ReferenceLine, Legend
} from 'recharts';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, subDays } from 'date-fns';
import { statsApi } from '../api/stats';
import { api } from '../api/services';
import { Download, TrendingUp, MousePointer2, ShoppingCart, Coins, Filter, Users, Megaphone, Target, Activity, Percent, Crown, Star, Award, Zap, Ticket, Link, AlertTriangle } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

// --- Components ---
import JourneySankey from '../components/JourneySankey';

// --- Components ---

const formatCompact = (val) => {
    if (val === undefined || val === null) return "0";
    if (val >= 1000000) return (val / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (val >= 1000) return (val / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    // For small numbers, limit decimal places to 2 to prevent overflow
    // and remove trailing zeros if integer
    return Number(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const ScoreCard = ({ title, value, subtext, icon: Icon, delay, variant = 'primary' }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.5 }}
        className={`${variant === 'primary'
            ? 'bg-white border border-gray-100 shadow-lg hover:shadow-xl hover:-translate-y-1 p-5 rounded-2xl'
            : 'bg-white/60 border border-indigo-200 hover:bg-white hover:border-indigo-300 hover:shadow-sm p-3 rounded-xl'
            } transition-all duration-300 overflow-hidden group`}
    >
        <div className={`flex justify-between items-start ${variant === 'primary' ? 'mb-2' : 'mb-0'}`}>
            <div className="min-w-0 pr-2">
                <p className={`${variant === 'primary' ? 'text-gray-500 font-medium text-xs mb-1' : 'text-gray-400 font-medium text-[10px] mb-0.5'} uppercase tracking-wide truncate`} title={title}>{title}</p>
                <h3 className={`${variant === 'primary' ? 'text-2xl font-bold' : 'text-lg font-bold'} text-gray-900 tracking-tight truncate`} title={value}>{value}</h3>
            </div>
            <div className={`rounded-lg shrink-0 ${variant === 'primary'
                ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 p-2'
                : 'bg-transparent text-gray-400 group-hover:text-indigo-500 p-1'
                }`}>
                <Icon className={`${variant === 'primary' ? 'w-4 h-4 text-indigo-500' : 'w-4 h-4'}`} />
            </div>
        </div>
        {subtext && <p className={`${variant === 'primary' ? 'text-emerald-500 mt-0' : 'text-gray-400 group-hover:text-emerald-500 mt-0.5'} text-[10px] font-medium flex items-center gap-1 truncate transition-colors`} title={subtext}>
            {variant === 'primary' && <TrendingUp className="w-3 h-3" />} {subtext}
        </p>}
    </motion.div>
);

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/90 backdrop-blur-md border border-gray-200 p-4 rounded-xl shadow-xl">
                <p className="text-gray-700 font-bold mb-2">{label}</p>
                {payload.map((p, index) => (
                    <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
                        <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: p.color }} />
                        <span className="text-sm text-gray-600 font-medium capitalize">{p.name}: <span className="text-gray-900 font-bold">{p.value.toLocaleString()}</span></span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const BestInfluencerCard = ({ influencer, totalRevenue, currencySymbol }) => {
    if (!influencer) return null;

    const share = totalRevenue > 0 ? ((influencer.revenue / totalRevenue) * 100).toFixed(1) : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 p-1 shadow-2xl mb-8 group"
        >
            {/* Animated Border Gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-purple-600 opacity-30 group-hover:opacity-50 transition-opacity duration-1000 animate-gradient-xy"></div>

            <div className="relative h-full bg-slate-900/90 backdrop-blur-xl rounded-[22px] p-6 sm:p-8 overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -ml-12 -mb-12 pointer-events-none"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">

                    {/* Left: Trophy & Identity */}
                    <div className="flex flex-col items-center md:items-start text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-bold uppercase tracking-wider mb-4 shadow-[0_0_10px_rgba(250,204,21,0.2)]">
                            <Crown className="w-3 h-3 fill-yellow-400" /> Top Performer
                        </div>

                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 p-0.5 shadow-lg shadow-orange-500/20">
                                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center border-2 border-transparent">
                                    <span className="text-2xl font-bold text-white">
                                        {influencer.name.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white tracking-tight">{influencer.name}</h3>
                                <p className="text-indigo-200 text-sm font-medium flex items-center gap-1 justify-center md:justify-start">
                                    @{influencer.handle} <Award className="w-3 h-3 text-yellow-500" />
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="hidden md:block w-px h-20 bg-slate-700/50"></div>

                    {/* Middle: Key Metric (Revenue) */}
                    <div className="flex-1 text-center md:text-left">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                            <div className="col-span-2 sm:col-span-1">
                                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Total Revenue</p>
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.4, type: "spring" }}
                                    className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200"
                                >
                                    {currencySymbol}{formatCompact(influencer.revenue)}
                                </motion.div>
                                <p className="text-emerald-400 text-[10px] font-bold mt-1">
                                    {share}% of total
                                </p>
                            </div>

                            <div className="text-center md:text-left">
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Purchases</p>
                                <p className="text-xl font-bold text-white">{influencer.purchases.toLocaleString()}</p>
                                <p className="text-slate-400 text-[10px]">Orders</p>
                            </div>

                            <div className="text-center md:text-left">
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Total Events</p>
                                <p className="text-xl font-bold text-white">{(influencer.events || 0).toLocaleString()}</p>
                                <p className="text-slate-400 text-[10px]">Interactions</p>
                            </div>

                            <div className="text-center md:text-left">
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Conv. Rate</p>
                                <div className="flex items-center gap-1 justify-center md:justify-start">
                                    <p className="text-xl font-bold text-white">
                                        {influencer.events > 0 ? ((influencer.purchases / influencer.events) * 100).toFixed(1) : 0}%
                                    </p>
                                    <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const CampaignsList = ({ data, currencySymbol }) => {
    if (!data || data.length === 0) return null;
    const maxRev = Math.max(...data.map(c => c.revenue));

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white border border-gray-100 rounded-3xl p-8 shadow-xl mb-8"
        >
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Top Campaigns</h2>
                    <p className="text-sm text-gray-500">Revenue performance by campaign</p>
                </div>
            </div>

            <div className="space-y-4">
                {/* Header Row */}
                <div className="grid grid-cols-12 gap-4 text-xs font-bold text-gray-400 uppercase tracking-wider px-2 pb-2 border-b border-gray-100">
                    <div className="col-span-4 pl-2">Campaign</div>
                    <div className="col-span-2 text-right">Events</div>
                    <div className="col-span-2 text-right">Orders</div>
                    <div className="col-span-2 text-right">Payout</div>
                    <div className="col-span-2 text-right">Revenue</div>
                </div>

                {data.slice(0, 5).map((camp, idx) => (
                    <div key={idx} className="group relative">
                        <div className="grid grid-cols-12 gap-4 items-center p-3 rounded-xl hover:bg-gray-50 transition-colors">
                            {/* Name & Status */}
                            <div className="col-span-4 flex items-center gap-3 min-w-0">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${camp.status === 'active' ? 'bg-emerald-500 shadow-emerald-200 shadow-md' : 'bg-gray-400'}`}></span>
                                <div className="min-w-0">
                                    <span className="block font-bold text-gray-800 truncate" title={camp.name}>{camp.name}</span>
                                    <span className="text-[10px] font-mono text-gray-400 bg-white px-1.5 py-0.5 rounded border border-gray-100 uppercase inline-block mt-0.5">{camp.status}</span>
                                </div>
                            </div>

                            {/* Stats Columns */}
                            <div className="col-span-2 text-right text-sm text-gray-600 font-medium">
                                {(camp.events || 0).toLocaleString()}
                            </div>
                            <div className="col-span-2 text-right text-sm text-gray-600 font-medium">
                                {(camp.purchases || 0).toLocaleString()}
                            </div>
                            <div className="col-span-2 text-right text-sm text-gray-600 font-medium">
                                {currencySymbol}{formatCompact(camp.payout || 0)}
                            </div>
                            <div className="col-span-2 text-right font-bold text-gray-900">
                                {currencySymbol}{formatCompact(camp.revenue)}
                            </div>
                        </div>

                        {/* Progress Bar Background (Subtle) */}
                        <div className="absolute bottom-0 left-3 right-3 h-1 bg-gray-50 rounded-full overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(camp.revenue / maxRev) * 100}%` }}
                                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

const InfluencersList = ({ data, currencySymbol }) => {
    if (!data || data.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white border border-gray-100 rounded-3xl p-8 shadow-xl h-full"
        >
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Top Influencers</h2>
                    <p className="text-sm text-gray-500">Highest revenue partners</p>
                </div>
            </div>

            <div className="space-y-2">
                {/* Header Row */}
                <div className="grid grid-cols-12 gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider px-2 pb-2 border-b border-gray-100">
                    <div className="col-span-5 pl-2">Influencer</div>
                    <div className="col-span-2 text-right">Events</div>
                    <div className="col-span-2 text-right">Orders</div>
                    <div className="col-span-3 text-right">Revenue</div>
                </div>

                {data.slice(0, 5).map((inf, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                        <div className="col-span-5 flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shadow-sm ring-2 ring-white shrink-0">
                                {inf.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                                <h4 className="font-bold text-gray-900 truncate text-sm" title={inf.name}>{inf.name}</h4>
                                <p className="text-[10px] text-gray-500 truncate">@{inf.handle}</p>
                            </div>
                        </div>

                        <div className="col-span-2 text-right text-xs text-gray-600 font-medium">
                            {(inf.total_events || inf.events || 0).toLocaleString()}
                        </div>
                        <div className="col-span-2 text-right text-xs text-gray-600 font-medium">
                            {(inf.purchases || 0).toLocaleString()}
                        </div>
                        <div className="col-span-3 text-right">
                            <p className="font-bold text-gray-900 text-sm">{currencySymbol}{formatCompact(inf.revenue)}</p>
                            <p className="text-[9px] text-emerald-600 font-medium">
                                {currencySymbol}{formatCompact(inf.payout || 0)} pay
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

const CouponsLinksGrid = ({ coupons, links, currencySymbol }) => {
    return (
        <div className="space-y-6 h-full">
            {/* Top Coupons */}
            {coupons && coupons.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white border border-gray-100 rounded-3xl p-6 shadow-lg"
                >
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-purple-500" /> Top Coupons
                    </h3>
                    <div className="space-y-3">
                        {coupons.slice(0, 3).map((c, idx) => (
                            <div key={idx} className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors">
                                <div className="flex justify-between items-center mb-2">
                                    <code className="text-sm font-bold text-purple-600 bg-white px-2 py-0.5 rounded shadow-sm border border-purple-100">
                                        {c.code}
                                    </code>
                                    <span className="text-sm font-bold text-gray-700">{currencySymbol}{formatCompact(c.revenue)}</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-gray-500 font-medium uppercase tracking-wide">
                                    <span>{(c.total_events || c.events || 0)} Events</span>
                                    <span>{(c.purchases || 0)} Orders</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Top Links */}
            {links && links.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-white border border-gray-100 rounded-3xl p-6 shadow-lg"
                >
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Link className="w-4 h-4 text-blue-500" /> Top Links
                    </h3>
                    <div className="space-y-3">
                        {links.slice(0, 3).map((l, idx) => (
                            <div key={idx} className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1 min-w-0 mr-3">
                                        <p className="text-xs font-medium text-blue-600 truncate">{l.short_code}</p>
                                        <p className="text-[10px] text-gray-400 truncate">{l.url}</p>
                                    </div>
                                    <span className="text-sm font-bold text-gray-700">{currencySymbol}{formatCompact(l.revenue)}</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-gray-500 font-medium uppercase tracking-wide">
                                    <span>{(l.total_events || l.events || 0)} Events</span>
                                    <span>{(l.clicks || 0)} Clicks</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    );
};

const ForecastChart = ({ data, loading }) => {
    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-gray-100 rounded-3xl p-8 shadow-xl"
            >
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-80 bg-gray-100 rounded-2xl"></div>
                </div>
            </motion.div>
        );
    }

    if (!data) return null;

    // Insufficient data alert
    if (!data.sufficient) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-8 shadow-lg"
            >
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-amber-900 mb-1">Insufficient Data for Forecasting</h3>
                        <p className="text-sm text-amber-700 leading-relaxed">
                            {data.message || `We need at least 14 days of historical data to generate reliable forecasts.`}
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                            <div className="h-2 bg-amber-200 rounded-full flex-1 max-w-[200px] overflow-hidden">
                                <div
                                    className="h-full bg-amber-500 rounded-full transition-all"
                                    style={{ width: `${Math.min(100, ((data.data_points || 0) / 14) * 100)}%` }}
                                />
                            </div>
                            <span className="text-xs font-bold text-amber-600">
                                {data.data_points || 0} / 14 days
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    // Build combined chart data
    const historical = (data.historical || []).map(d => ({
        date: d.date,
        clicks: d.clicks,
        purchases: d.purchases,
        type: 'historical'
    }));

    const forecast = (data.forecast || []).map((d, i) => {
        const conf = data.confidence?.[i] || {};
        return {
            date: d.date,
            forecastClicks: d.clicks,
            forecastPurchases: d.purchases,
            clicksUpper: conf.clicks_upper,
            clicksLower: conf.clicks_lower,
            purchasesUpper: conf.purchases_upper,
            purchasesLower: conf.purchases_lower,
            type: 'forecast'
        };
    });

    // Bridge: last historical point duplicated as first forecast point
    const bridge = historical.length > 0 ? [{
        ...historical[historical.length - 1],
        forecastClicks: historical[historical.length - 1].clicks,
        forecastPurchases: historical[historical.length - 1].purchases,
        clicksUpper: historical[historical.length - 1].clicks,
        clicksLower: historical[historical.length - 1].clicks,
        purchasesUpper: historical[historical.length - 1].purchases,
        purchasesLower: historical[historical.length - 1].purchases,
    }] : [];

    const combined = [...historical, ...bridge.map(b => ({ ...b, type: 'bridge' })), ...forecast];
    const todayStr = new Date().toISOString().split('T')[0];

    // Show last 60 days of historical + all forecast for a clean view
    const trimmedHistorical = historical.length > 60 ? historical.slice(-60) : historical;
    const chartData = [...trimmedHistorical, ...bridge.map(b => ({ ...b, type: 'bridge' })), ...forecast];

    const formatDate = (d) => {
        if (!d) return '';
        const parts = d.split('-');
        return `${parts[1]}/${parts[2]}`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white border border-gray-100 rounded-3xl p-8 shadow-xl"
        >
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Traffic & Sales Forecast</h2>
                    <p className="text-sm text-gray-500">
                        {data.days_ahead}-day prediction based on {data.data_points} days of history
                    </p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-0.5 bg-blue-500 rounded"></span> Clicks
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-0.5 bg-emerald-500 rounded"></span> Sales
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-0.5 bg-blue-300 rounded" style={{ borderBottom: '2px dashed' }}></span> Forecast
                    </span>
                </div>
            </div>

            <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                        <defs>
                            <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.15} />
                                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.02} />
                            </linearGradient>
                            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10B981" stopOpacity={0.15} />
                                <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                            </linearGradient>
                            <linearGradient id="confClicksGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#93C5FD" stopOpacity={0.2} />
                                <stop offset="100%" stopColor="#93C5FD" stopOpacity={0.05} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                            dataKey="date"
                            tickFormatter={formatDate}
                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                            tickLine={false}
                            axisLine={{ stroke: '#e2e8f0' }}
                            interval={Math.max(1, Math.floor(chartData.length / 12))}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                            tickLine={false}
                            axisLine={false}
                            width={50}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(255,255,255,0.95)',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                fontSize: '12px'
                            }}
                            labelFormatter={(val) => `Date: ${val}`}
                        />

                        {/* Confidence Bands */}
                        <Area
                            type="monotone"
                            dataKey="clicksUpper"
                            stroke="none"
                            fill="#DBEAFE"
                            fillOpacity={0.4}
                            connectNulls={false}
                        />
                        <Area
                            type="monotone"
                            dataKey="clicksLower"
                            stroke="none"
                            fill="#ffffff"
                            fillOpacity={1}
                            connectNulls={false}
                        />

                        {/* Historical lines */}
                        <Area
                            type="monotone"
                            dataKey="clicks"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            fill="url(#clicksGrad)"
                            dot={false}
                            connectNulls={false}
                        />
                        <Area
                            type="monotone"
                            dataKey="purchases"
                            stroke="#10B981"
                            strokeWidth={2}
                            fill="url(#salesGrad)"
                            dot={false}
                            connectNulls={false}
                        />

                        {/* Forecast lines (dashed) */}
                        <Line
                            type="monotone"
                            dataKey="forecastClicks"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            strokeDasharray="6 4"
                            dot={false}
                            connectNulls={false}
                            name="Clicks (forecast)"
                        />
                        <Line
                            type="monotone"
                            dataKey="forecastPurchases"
                            stroke="#10B981"
                            strokeWidth={2}
                            strokeDasharray="6 4"
                            dot={false}
                            connectNulls={false}
                            name="Sales (forecast)"
                        />

                        {/* Today line */}
                        <ReferenceLine
                            x={todayStr}
                            stroke="#6366F1"
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                            label={{
                                value: 'Today',
                                position: 'top',
                                fill: '#6366F1',
                                fontSize: 11,
                                fontWeight: 600
                            }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
};

// --- Main Page ---

const Dashboard = () => {
    // Currency
    const { getSymbol, formatCurrency } = useCurrency();

    // State
    const [dateRange, setDateRange] = useState([subDays(new Date(), 30), new Date()]);
    const [startDate, endDate] = dateRange;

    // Selectors & Filters
    const [advertisers, setAdvertisers] = useState([]);
    const [selectedAdvertiser, setSelectedAdvertiser] = useState(null);
    const [campaigns, setCampaigns] = useState([]);
    const [selectedCampaign, setSelectedCampaign] = useState('');
    const [influencersFilter, setInfluencersFilter] = useState([]); // List for dropdown
    const [selectedInfluencer, setSelectedInfluencer] = useState('');

    // Data
    const [overview, setOverview] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [breakdownData, setBreakdownData] = useState([]);
    const [journeyData, setJourneyData] = useState([]); // [NEW] State for sankey
    const [topInfluencer, setTopInfluencer] = useState(null); // [NEW] Top performer
    const [isCompact, setIsCompact] = useState(false); // [NEW] Layout toggle

    // Stacked Data States
    const [campaignsData, setCampaignsData] = useState([]);
    const [influencersData, setInfluencersData] = useState([]);
    const [couponsData, setCouponsData] = useState([]);
    const [linksData, setLinksData] = useState([]);

    const [loading, setLoading] = useState(false);

    // Forecast State
    const [forecastData, setForecastData] = useState(null);
    const [forecastLoading, setForecastLoading] = useState(false);

    // New Flexible Stats State (kept for fallback)
    const [activeTab, setActiveTab] = useState('campaigns');
    const [breakdownTableData, setBreakdownTableData] = useState([]);

    // Initial Load: Advertisers
    useEffect(() => {
        const loadAdvertisers = async () => {
            try {
                const res = await api.advertisers.list();
                setAdvertisers(res.data);
                if (res.data.length > 0 && !selectedAdvertiser) {
                    const savedId = localStorage.getItem('dashboard_advertiser_id');
                    const target = savedId ? res.data.find(a => a.id == savedId) : res.data[0];
                    setSelectedAdvertiser(target || res.data[0]);
                }
            } catch (err) {
                console.error("Failed to load advertisers", err);
            }
        };
        loadAdvertisers();
    }, []);

    // Load Filters
    useEffect(() => {
        if (!selectedAdvertiser) return;
        localStorage.setItem('dashboard_advertiser_id', selectedAdvertiser.id);

        const loadFilters = async () => {
            try {
                const [campRes, infRes] = await Promise.all([
                    api.campaigns.list({ advertiser_id: selectedAdvertiser.id }),
                    api.influencers.list({ advertiser_id: selectedAdvertiser.id })
                ]);

                setCampaigns(campRes.data);
                setInfluencersFilter(infRes.data);

                // Reset selections when advertiser changes
                if (selectedAdvertiser.id !== campaigns[0]?.advertiser_id) { // simple check or just reset always
                    setSelectedCampaign('');
                    setSelectedInfluencer('');
                }
            } catch (err) {
                console.error("Failed to load filters", err);
            }
        };
        loadFilters();
    }, [selectedAdvertiser]);

    // Fetch Dashboard Data
    const fetchData = async () => {
        if (!selectedAdvertiser) return;
        setLoading(true);
        try {
            const params = {
                from: startDate ? startDate.toISOString() : null,
                to: endDate ? endDate.toISOString() : null,
                advertiser_id: selectedAdvertiser.id,
                campaign_id: selectedCampaign || null,
                influencer_id: selectedInfluencer || null
            };

            const [ovRes, chRes, bkRes, infRes, campRes, journeyRes, couponRes, linkRes] = await Promise.all([
                statsApi.getOverview(null, params),
                statsApi.getChartData(null, params),
                statsApi.getBreakdown(null, params),
                statsApi.getInfluencers(null, params),
                statsApi.getCampaigns(null, params),
                statsApi.getJourneyStats(null, params),
                statsApi.getCoupons(null, params),
                statsApi.getTrackingLinks(null, params)
            ]);

            setOverview(ovRes.data);
            setChartData(chRes.data);
            setBreakdownData(bkRes.data);
            setJourneyData(journeyRes.data);

            // Set Stacked Data
            setInfluencersData(infRes.data || []);
            setCampaignsData(campRes.data || []);
            setCouponsData(couponRes.data || []);
            setLinksData(linkRes.data || []);

            // Fetch Forecast (separate call, non-blocking)
            setForecastLoading(true);
            statsApi.getForecast(null, {
                advertiser_id: selectedAdvertiser.id,
                days_ahead: 30
            }).then(fcRes => {
                setForecastData(fcRes.data);
            }).catch(err => {
                console.error('Forecast fetch failed:', err);
                setForecastData(null);
            }).finally(() => {
                setForecastLoading(false);
            });

            // Calculate Top Influencer from infRes (which returns detailed stats per influencer)
            if (infRes.data && infRes.data.length > 0) {
                // Sort by revenue descending
                const sorted = [...infRes.data].sort((a, b) => b.revenue - a.revenue);
                setTopInfluencer(sorted[0]);
            } else {
                setTopInfluencer(null);
            }

        } catch (error) {
            console.error("Failed to fetch stats:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBreakdownData = async () => {
        if (!selectedAdvertiser) return;
        try {
            const params = {
                from: startDate ? startDate.toISOString() : null,
                to: endDate ? endDate.toISOString() : null,
                advertiser_id: selectedAdvertiser.id,
                campaign_id: selectedCampaign || null,
                influencer_id: selectedInfluencer || null
            };

            let res;
            if (activeTab === 'campaigns') res = await statsApi.getCampaigns(null, params);
            else if (activeTab === 'influencers') res = await statsApi.getInfluencers(null, params);
            else if (activeTab === 'coupons') res = await statsApi.getCoupons(null, params);
            else if (activeTab === 'links') res = await statsApi.getTrackingLinks(null, params);

            setBreakdownTableData(res.data);
        } catch (err) {
            console.error("Failed to fetch breakdown table", err);
        }
    };

    useEffect(() => {
        if (selectedAdvertiser) fetchData();
    }, [selectedAdvertiser, dateRange, selectedCampaign, selectedInfluencer]);

    useEffect(() => {
        if (selectedAdvertiser) fetchBreakdownData();
    }, [selectedAdvertiser, dateRange, selectedCampaign, selectedInfluencer, activeTab]);

    const handleExport = () => {
        if (!selectedAdvertiser) return;
        const params = {
            from: startDate ? startDate.toISOString() : null,
            to: endDate ? endDate.toISOString() : null,
            advertiser_id: selectedAdvertiser.id,
            campaign_id: selectedCampaign || null,
            influencer_id: selectedInfluencer || null
        };
        statsApi.downloadExport(null, params);
    };

    // Calculate AOV
    const aov = overview?.total_conversions > 0
        ? (overview.total_revenue / overview.total_conversions).toFixed(2)
        : "0.00";

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header & Controls */}
                {/* Header: Title & Global Controls (Date/Export) */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-2"
                >
                    <div>
                        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
                            Performance Overview
                        </h1>
                        <p className="text-gray-500 mt-1">Real-time SuperRoot Dashboard</p>
                    </div>

                    {/* Date & Export Group */}
                    <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm self-stretch lg:self-auto">
                        <div className="relative flex-1 lg:flex-none">
                            <DatePicker
                                selectsRange={true}
                                startDate={startDate}
                                endDate={endDate}
                                onChange={(update) => setDateRange(update)}
                                className="bg-transparent text-gray-700 text-sm font-medium outline-none w-full lg:w-56 text-center cursor-pointer placeholder-gray-500 py-2"
                                dateFormat="MMM d, yyyy"
                                placeholderText="Select Date Range"
                            />
                        </div>
                        <div className="h-6 w-px bg-gray-200"></div>
                        <button
                            onClick={handleExport}
                            className="bg-gray-50 hover:bg-gray-100 text-indigo-600 p-2 rounded-lg transition-all"
                            title="Export CSV"
                        >
                            <Download className="w-5 h-5" />
                        </button>
                    </div>
                </motion.div>

                {/* Filters Row: Full Width Grid */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                    {/* Advertiser Select */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm relative group hover:border-indigo-300 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3 px-4 py-2 pointer-events-none">
                            <Users className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                            <div className="flex-1 min-w-0">
                                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Advertiser</label>
                                <div className="text-sm font-medium text-gray-700 truncate w-full">
                                    {selectedAdvertiser?.name || "Select Advertiser"}
                                </div>
                            </div>
                        </div>
                        <select
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            value={selectedAdvertiser?.id || ''}
                            onChange={(e) => {
                                const adv = advertisers.find(a => a.id == e.target.value);
                                setSelectedAdvertiser(adv);
                            }}
                        >
                            <option value="" disabled>Select Advertiser</option>
                            {advertisers.map(adv => (
                                <option key={adv.id} value={adv.id}>{adv.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Campaign Select */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm relative group hover:border-indigo-300 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3 px-4 py-2 pointer-events-none">
                            <Megaphone className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                            <div className="flex-1 min-w-0">
                                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Campaign</label>
                                <div className="text-sm font-medium text-gray-700 truncate w-full">
                                    {campaigns.find(c => c.id == selectedCampaign)?.name || `All Campaigns (${campaigns.length})`}
                                </div>
                            </div>
                        </div>
                        <select
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            value={selectedCampaign}
                            onChange={(e) => setSelectedCampaign(e.target.value)}
                        >
                            <option value="">All Campaigns ({campaigns.length})</option>
                            {campaigns.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Influencer Select */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm relative group hover:border-indigo-300 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3 px-4 py-2 pointer-events-none">
                            <Filter className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                            <div className="flex-1 min-w-0">
                                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Influencer</label>
                                <div className="text-sm font-medium text-gray-700 truncate w-full">
                                    {influencersFilter.find(i => i.id == selectedInfluencer)?.name || `All Influencers (${influencersFilter.length})`}
                                </div>
                            </div>
                        </div>
                        <select
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            value={selectedInfluencer}
                            onChange={(e) => setSelectedInfluencer(e.target.value)}
                        >
                            <option value="">All Influencers ({influencersFilter.length})</option>
                            {influencersFilter.map(inf => (
                                <option key={inf.id} value={inf.id}>{inf.name} (@{inf.social_handle})</option>
                            ))}
                        </select>
                    </div>
                </motion.div>

                {loading && (
                    <div className="text-center py-12 text-gray-500 animate-pulse">Loading data...</div>
                )}

                {!loading && overview && (
                    <>
                        {/* Scorecards */}
                        {/* Primary Row: Financials */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-2">
                            <ScoreCard
                                title="Campaign Value"
                                value={`${getSymbol()}${formatCompact(overview?.campaign_value || 0)}`}
                                subtext="Active Budget"
                                icon={Target}
                                delay={0.1}
                            />
                            <ScoreCard
                                title="Revenue"
                                value={`${getSymbol()}${formatCompact(overview?.total_revenue || 0)}`}
                                icon={Coins}
                                delay={0.2}
                            />
                            <ScoreCard
                                title="RoII"
                                value={`${overview?.roii || 0}%`}
                                subtext="Return on Inv."
                                icon={Percent}
                                delay={0.3}
                            />
                            <ScoreCard
                                title="Est. Payout"
                                value={`${getSymbol()}${formatCompact(overview?.total_payout || 0)}`}
                                subtext="Total Estimated"
                                icon={Coins}
                                delay={0.4}
                            />
                            <ScoreCard
                                title="AOV"
                                value={`${getSymbol()}${aov}`}
                                subtext="Avg Order Value"
                                icon={TrendingUp}
                                delay={0.5}
                            />
                        </div>

                        {/* Secondary Row: Glass Dock (Activity) */}
                        <div className="flex flex-wrap md:flex-nowrap items-center justify-between px-6 py-3 bg-white/40 backdrop-blur-md border border-white/60 rounded-full shadow-sm mx-auto w-full md:max-w-5xl mb-8 gap-4 md:gap-0">

                            <div className="flex items-center gap-3 px-2 group">
                                <div className="p-2 rounded-full bg-indigo-50/50 text-indigo-500 group-hover:bg-indigo-100/50 transition-colors">
                                    <Users className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Active Influencers</p>
                                    <p className="text-lg font-bold text-gray-800">{formatCompact(overview?.total_influencers || 0)}</p>
                                </div>
                            </div>

                            <div className="hidden md:block w-px h-8 bg-gray-200/60"></div>

                            <div className="flex items-center gap-3 px-2 group">
                                <div className="p-2 rounded-full bg-purple-50/50 text-purple-500 group-hover:bg-purple-100/50 transition-colors">
                                    <MousePointer2 className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Total Clicks</p>
                                    <p className="text-lg font-bold text-gray-800">{formatCompact(overview?.total_clicks || 0)}</p>
                                </div>
                            </div>

                            <div className="hidden md:block w-px h-8 bg-gray-200/60"></div>

                            <div className="flex items-center gap-3 px-2 group">
                                <div className="p-2 rounded-full bg-blue-50/50 text-blue-500 group-hover:bg-blue-100/50 transition-colors">
                                    <Activity className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Total Events</p>
                                    <p className="text-lg font-bold text-gray-800">{formatCompact(overview?.total_events || 0)}</p>
                                </div>
                            </div>

                            <div className="hidden md:block w-px h-8 bg-gray-200/60"></div>

                            <div className="flex items-center gap-3 px-2 group">
                                <div className="p-2 rounded-full bg-emerald-50/50 text-emerald-500 group-hover:bg-emerald-100/50 transition-colors">
                                    <ShoppingCart className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Conversions</p>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-lg font-bold text-gray-800">{formatCompact(overview?.total_conversions || 0)}</p>
                                        <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                            {overview?.conversion_rate || 0}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Charts Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Main Chart */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.5 }}
                                className="lg:col-span-2 bg-white border border-gray-100 rounded-3xl p-8 shadow-xl"
                            >
                                <div className="flex justify-between items-center mb-8">
                                    <h2 className="text-2xl font-bold text-gray-800">Traffic vs Sales</h2>
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                                            <span className="text-sm text-gray-500">Clicks</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                                            <span className="text-sm text-gray-500">Revenue</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-[400px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                            <XAxis
                                                dataKey="date"
                                                stroke="#9ca3af"
                                                tick={{ fill: '#6b7280' }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                yAxisId="left"
                                                stroke="#9ca3af"
                                                tick={{ fill: '#6b7280' }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                yAxisId="right"
                                                orientation="right"
                                                stroke="#34d399"
                                                tick={{ fill: '#10b981' }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '4 4' }} />

                                            <Area
                                                yAxisId="left"
                                                type="monotone"
                                                dataKey="clicks"
                                                stroke="#8b5cf6"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorClicks)"
                                            />
                                            <Area
                                                yAxisId="right"
                                                type="monotone"
                                                dataKey="revenue"
                                                stroke="#34d399"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorRev)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </motion.div>

                            {/* Activity Funnel */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.55 }}
                                className="bg-white border border-gray-100 rounded-3xl p-8 shadow-xl h-full flex flex-col"
                            >
                                <h2 className="text-2xl font-bold text-gray-800 mb-6">Activity Flow</h2>
                                <div className="flex-1 overflow-y-auto pr-2 space-y-5 custom-scrollbar">
                                    {breakdownData.length === 0 ? (
                                        <p className="text-gray-400 text-center mt-10">No activity data</p>
                                    ) : (
                                        breakdownData
                                            .sort((a, b) => b.value - a.value)
                                            .map((item, idx) => {
                                                const max = Math.max(...breakdownData.map(i => i.value));
                                                const percent = (item.value / max * 100).toFixed(0);
                                                return (
                                                    <div key={idx} className="group">
                                                        <div className="flex justify-between text-sm mb-2">
                                                            <span className="text-gray-600 capitalize font-semibold">{item.name.replaceAll('_', ' ')}</span>
                                                            <span className="text-gray-900 font-bold">{item.value.toLocaleString()}</span>
                                                        </div>
                                                        <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${percent}%` }}
                                                                transition={{ duration: 1, delay: 0.5 + (idx * 0.1) }}
                                                                className={`h-full rounded-full ${item.name === 'purchase' ? 'bg-emerald-500 shadow-emerald-200' :
                                                                    item.name === 'add_to_cart' ? 'bg-blue-500 shadow-blue-200' :
                                                                        'bg-purple-500 shadow-purple-200'
                                                                    } shadow-lg`}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })
                                    )}
                                </div>
                            </motion.div>
                        </div>

                        {/* Journey & Breakdown Row */}
                        <div className="grid grid-cols-1 gap-8 mb-8">
                            <JourneySankey data={journeyData} loading={loading} />
                        </div>

                        {/* Best Performing Influencer Section */}
                        {topInfluencer && topInfluencer.revenue > 0 && (
                            <BestInfluencerCard
                                influencer={topInfluencer}
                                totalRevenue={overview?.total_revenue || 0}
                                currencySymbol={getSymbol()}
                            />
                        )}

                        {/* Header with Toggle */}
                        <div className="flex justify-between items-center mb-8 px-2">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">Detailed Breakdown</h2>
                                <p className="text-gray-500 text-sm">Analyze performance by specific entities</p>
                            </div>

                            {/* Layout Toggle */}
                            <div className="flex items-center gap-3 bg-gray-100 p-1.5 rounded-full">
                                <span className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all cursor-pointer ${!isCompact ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setIsCompact(false)}>
                                    Stacked
                                </span>
                                <span className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all cursor-pointer ${isCompact ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setIsCompact(true)}>
                                    Compact
                                </span>
                            </div>
                        </div>

                        {/* Stacked Layout: Campaigns, Influencers, Coupons/Links */}
                        {!loading && !isCompact && (
                            <div className="space-y-8 animate-fade-in-up">
                                {/* Row 1: Top Campaigns (Full Width) */}
                                <CampaignsList data={campaignsData} currencySymbol={getSymbol()} />

                                {/* Row 2: Split Influencers (60%) & Coupons/Links (40%) */}
                                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                                    <div className="lg:col-span-3">
                                        <InfluencersList data={influencersData} currencySymbol={getSymbol()} />
                                    </div>
                                    <div className="lg:col-span-2">
                                        <CouponsLinksGrid coupons={couponsData} links={linksData} currencySymbol={getSymbol()} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Compact Table View */}
                        {!loading && isCompact && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-white border border-gray-100 rounded-3xl p-8 shadow-xl"
                            >
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                                    <div className="flex p-1 bg-gray-100/80 rounded-xl">
                                        {['campaigns', 'influencers', 'coupons', 'links'].map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => setActiveTab(tab)}
                                                className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${activeTab === tab
                                                    ? 'bg-white text-indigo-600 shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="overflow-x-auto min-h-[400px]">
                                    <AnimatePresence mode='wait'>
                                        <motion.div
                                            key={activeTab}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 10 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b border-gray-100 text-gray-400 text-sm uppercase tracking-wider">
                                                        <th className="pb-4 font-semibold pl-4">Name / Code</th>
                                                        {activeTab === 'links' && <th className="pb-4 font-semibold">Destination</th>}
                                                        {activeTab === 'campaigns' && <th className="pb-4 font-semibold">Status</th>}
                                                        {activeTab === 'influencers' && <th className="pb-4 font-semibold">Handle</th>}
                                                        {activeTab === 'links' && <th className="pb-4 font-semibold text-right">Clicks</th>}
                                                        <th className="pb-4 font-semibold text-right">Events</th>
                                                        <th className="pb-4 font-semibold text-right">Purchases</th>
                                                        {(activeTab === 'campaigns' || activeTab === 'influencers') && <th className="pb-4 font-semibold text-right">Payout</th>}
                                                        <th className="pb-4 font-semibold text-right pr-4">Revenue</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {breakdownTableData.map((row, idx) => (
                                                        <tr key={idx} className="group hover:bg-gray-50/50 transition-colors">
                                                            <td className="py-4 pl-4 font-medium text-gray-800">
                                                                {activeTab === 'campaigns' ? row.name :
                                                                    activeTab === 'influencers' ? row.name :
                                                                        activeTab === 'coupons' ? (
                                                                            <span className="font-mono bg-purple-50 text-purple-600 px-2 py-1 rounded border border-purple-100">{row.code}</span>
                                                                        ) : (
                                                                            <span className="font-mono bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100">{row.short_code}</span>
                                                                        )}
                                                            </td>
                                                            {activeTab === 'links' && (
                                                                <td className="py-4 text-gray-500 text-sm truncate max-w-[200px]" title={row.url}>
                                                                    {row.url}
                                                                </td>
                                                            )}
                                                            {activeTab === 'campaigns' && (
                                                                <td className="py-4">
                                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${row.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                                                        {row.status}
                                                                    </span>
                                                                </td>
                                                            )}
                                                            {activeTab === 'influencers' && (
                                                                <td className="py-4 text-gray-500 text-sm">@{row.handle}</td>
                                                            )}
                                                            {activeTab === 'links' && (
                                                                <td className="py-4 text-right text-gray-600">{(row.clicks || 0).toLocaleString()}</td>
                                                            )}
                                                            <td className="py-4 text-right text-gray-600">
                                                                {(row.events || row.total_events || 0).toLocaleString()}
                                                            </td>
                                                            <td className="py-4 text-right text-gray-600">
                                                                {(row.purchases || 0).toLocaleString()}
                                                            </td>
                                                            {(activeTab === 'campaigns' || activeTab === 'influencers') && (
                                                                <td className="py-4 text-right text-gray-600">
                                                                    {getSymbol()}{formatCompact(row.payout || 0)}
                                                                </td>
                                                            )}
                                                            <td className="py-4 text-right pr-4 font-bold text-gray-900">
                                                                {getSymbol()}{formatCompact(row.revenue || 0)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {breakdownTableData.length === 0 && (
                                                        <tr>
                                                            <td colSpan="6" className="py-12 text-center text-gray-400">
                                                                No data found for {activeTab}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        )}

                        {/* Forecast Graph */}
                        <ForecastChart data={forecastData} loading={forecastLoading} />
                    </>
                )}

                {!loading && !selectedAdvertiser && (
                    <div className="flex h-64 items-center justify-center text-gray-400 border border-dashed border-gray-300 rounded-2xl">
                        Select an advertiser to view performance data
                    </div>
                )}

            </div>
        </div>
    );
};

export default Dashboard;
