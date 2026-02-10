import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, subDays } from 'date-fns';
import { statsApi } from '../api/stats';
import { api } from '../api/services';
import { Download, TrendingUp, MousePointer2, ShoppingCart, Coins, Filter, Users, Megaphone, Target, Activity, Percent } from 'lucide-react';
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
    const [loading, setLoading] = useState(false);

    // New Flexible Stats State
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

                setSelectedCampaign('');
                setSelectedInfluencer('');
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

            const [ovRes, chRes, bkRes, infRes, campRes, journeyRes] = await Promise.all([
                statsApi.getOverview(null, params),
                statsApi.getChartData(null, params),
                statsApi.getBreakdown(null, params),
                statsApi.getInfluencers(null, params),
                statsApi.getCampaigns(null, params),
                statsApi.getJourneyStats(null, params)
            ]);

            setOverview(ovRes.data);
            setChartData(chRes.data);
            setBreakdownData(bkRes.data);
            setJourneyData(journeyRes.data);

            // We no longer populate the static tables separately, the new section handles it via effect
            // setInfluencersTable(infRes.data);
            // setCampaignsTable(campRes.data);

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
                            Performance
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

                        {/* Granular Insights Section */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="bg-white border border-gray-100 rounded-3xl p-8 shadow-xl"
                        >
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800">Detailed Breakdown</h2>
                                    <p className="text-gray-500 text-sm">Analyze performance by specific entities</p>
                                </div>
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

                            <div className="overflow-x-auto">
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
                            </div>
                        </motion.div>
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
