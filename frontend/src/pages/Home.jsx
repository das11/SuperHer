import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    LayoutDashboard, ArrowUpRight, Target, Zap, Users, Activity,
    TrendingUp, DollarSign, Plus, BookOpen, Settings, BarChart3,
    ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { api } from '../api/services';
import { statsApi } from '../api/stats';
import { subDays } from 'date-fns';

import { useAuth } from '../context/AuthContext';

export default function Home() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        advertisers: 0,
        activeCampaigns: 0,
        influencers: 0,
        revenue: 0,
        clicks: 0
    });
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                // Fetch Counts
                const [advRes, campRes, infRes] = await Promise.all([
                    api.advertisers.list(),
                    api.campaigns.list(),
                    api.influencers.list()
                ]);

                // Fetch Stats Overview (Last 30 Days)
                const endDate = new Date();
                const startDate = subDays(endDate, 30);

                // Scope Logic:
                // SuperRoot: ALWAYS Default to Global (null) for the main Dashboard Overview.
                // Advertiser: Use their own ID.

                let targetId = null;

                if (user?.role === 'SUPERROOT') {
                    // Force Global View for SuperRoot on Home Dashboard
                    targetId = null;
                } else {
                    // Regular Advertiser
                    // Use their linked ID, or fallback to first allowed in list
                    targetId = user?.advertiser_id || (advRes.data.length > 0 ? advRes.data[0].id : null);
                }

                let revenue = 0;
                let clicks = 0;
                let cData = [];

                // Only fetch stats if we have a valid target OR we are SuperRoot allowed to see Global
                // (Advertisers with no ID shouldn't see anything or errors)
                const canFetch = (user?.role === 'SUPERROOT') || targetId;

                if (canFetch) {
                    const params = {
                        from: startDate.toISOString(),
                        to: endDate.toISOString()
                    };

                    if (targetId) {
                        params.advertiser_id = targetId;
                    }

                    const [ovRes, chRes] = await Promise.all([
                        statsApi.getOverview(null, params),
                        statsApi.getChartData(null, params)
                    ]);

                    revenue = ovRes.data.total_revenue;
                    clicks = ovRes.data.total_clicks;
                    cData = chRes.data;
                }

                setStats({
                    advertisers: advRes.data.length,
                    activeCampaigns: campRes.data.filter(c => c.status === 'active').length,
                    influencers: infRes.data.length,
                    revenue: revenue,
                    clicks: clicks
                });
                setChartData(cData);

            } catch (err) {
                console.error("Home Data Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        };

        // Wait for user to be loaded before fetching
        if (user !== undefined) {
            loadDashboardData();
        }
    }, [user]);

    // Cards Configuration
    const cards = [
        {
            title: 'Total Advertisers',
            value: stats.advertisers,
            trend: 'Platform-wide',
            icon: <Target className="text-white" />,
            to: '/advertisers',
            color: 'bg-blue-600',
            trendColor: 'text-blue-600 bg-blue-50'
        },
        {
            title: 'Active Campaigns',
            value: stats.activeCampaigns,
            trend: 'Currently Live',
            icon: <Zap className="text-white" />,
            to: '/campaigns',
            color: 'bg-indigo-600',
            trendColor: 'text-indigo-600 bg-indigo-50'
        },
        {
            title: 'Total Influencers',
            value: stats.influencers,
            trend: 'Registered',
            icon: <Users className="text-white" />,
            to: '/influencers',
            color: 'bg-purple-600',
            trendColor: 'text-purple-600 bg-purple-50'
        },
        {
            title: 'Total Revenue (30d)',
            value: `$${(stats.revenue || 0).toLocaleString()}`,
            trend: '+12.5%', // Placeholder for now or calc from previous period
            icon: <DollarSign className="text-white" />,
            to: '/dashboard',
            color: 'bg-emerald-600',
            trendColor: 'text-emerald-600 bg-emerald-50'
        },
    ];

    if (loading) return <div className="p-12 text-center text-slate-400">Loading overview...</div>;

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h2>
                    <p className="text-slate-500 mt-2">Welcome back. Here's what's happening across the platform.</p>
                </div>
                <div className="flex gap-3">
                    <Link to="/integration-docs" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                        <BookOpen size={16} />
                        Documentation
                    </Link>
                    <Link to="/campaigns" className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20">
                        <Plus size={16} />
                        New Campaign
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, idx) => (
                    <Link
                        key={idx}
                        to={card.to}
                        className="group block p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                    >
                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div className={`p-3.5 rounded-xl shadow-lg ${card.color} shadow-opacity-30`}>
                                {card.icon}
                            </div>
                            <div className={`px-2.5 py-1 text-xs font-bold rounded-full border flex items-center gap-1 ${card.trendColor} border-opacity-20`}>
                                <TrendingUp size={12} /> {card.trend}
                            </div>
                        </div>

                        <h3 className="text-3xl font-bold text-slate-900 mb-1 relative z-10">{card.value}</h3>
                        <p className="text-sm font-medium text-slate-400 group-hover:text-slate-600 transition-colors relative z-10">{card.title}</p>

                        {/* Decorative background blob */}
                        <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-500 ${card.color}`}></div>
                    </Link>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Visual Trend Chart */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Performance Trend</h3>
                            <p className="text-sm text-slate-500">Revenue & Clicks over the last 30 days</p>
                        </div>
                        <Link to="/dashboard" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                            Full Analytics <ArrowRight size={16} />
                        </Link>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorRevHome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="date" hide />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorRevHome)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Quick Actions / System Status */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Activity size={20} className="text-slate-400" />
                            Quick Actions
                        </h3>
                        <div className="space-y-3">
                            <Link to="/campaigns" className="block w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors flex items-center gap-3 group">
                                <div className="p-2 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                                    <Zap size={18} className="text-indigo-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-700 text-sm">Launch Campaign</p>
                                    <p className="text-xs text-slate-500">Create new tracking & offers</p>
                                </div>
                            </Link>

                            <Link to="/influencers" className="block w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors flex items-center gap-3 group">
                                <div className="p-2 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                                    <Users size={18} className="text-purple-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-700 text-sm">Add Influencer</p>
                                    <p className="text-xs text-slate-500">Onboard new partners</p>
                                </div>
                            </Link>

                            <Link to="/settings" className="block w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors flex items-center gap-3 group">
                                <div className="p-2 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                                    <Settings size={18} className="text-slate-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-700 text-sm">Manage API Keys</p>
                                    <p className="text-xs text-slate-500">Security settings</p>
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* System Status / Integration Promo */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="font-bold text-lg mb-2">System Status</h3>
                            <div className="flex items-center gap-2 mb-6">
                                <span className="flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                </span>
                                <span className="text-emerald-400 text-sm font-medium">All Systems Operational</span>
                            </div>

                            <div className="pt-4 border-t border-slate-700/50">
                                <Link to="/integration-docs" className="text-sm text-slate-300 hover:text-white flex items-center gap-2">
                                    Check Integration Status <ArrowRight size={14} />
                                </Link>
                            </div>
                        </div>
                        {/* Decorative elements */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 opacity-10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500 opacity-10 rounded-full blur-xl -ml-8 -mb-8 pointer-events-none"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
