import React, { useEffect, useState } from 'react';
import { api } from '../api/services';
import { Megaphone, Calendar, TrendingUp, Plus, DollarSign, Clock, CheckCircle, AlertCircle, Play } from 'lucide-react';

export default function Campaigns() {
    const [campaigns, setCampaigns] = useState([]);
    const [advertisers, setAdvertisers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [form, setForm] = useState({
        name: '',
        advertiser_id: '',
        budget: '',
        start_date: '',
        end_date: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [campRes, advRes] = await Promise.all([
                api.campaigns.list(),
                api.advertisers.list()
            ]);
            setCampaigns(campRes.data);
            setAdvertisers(advRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (!form.advertiser_id) return alert('Select an advertiser');

            const payload = {
                ...form,
                advertiser_id: parseInt(form.advertiser_id),
                budget: parseFloat(form.budget || 0),
                status: 'draft'
            };

            await api.campaigns.create(payload);
            setForm({ name: '', advertiser_id: '', budget: '', start_date: '', end_date: '' });
            fetchData();
        } catch (err) {
            alert('Error creating campaign');
        }
    };

    const handleStatusUpdate = async (id, newStatus) => {
        try {
            await api.campaigns.update(id, { status: newStatus });
            fetchData();
        } catch (err) {
            alert('Error updating status');
        }
    };

    const getAdvertiserName = (id) => {
        const adv = advertisers.find(a => a.id === id);
        return adv ? adv.name : 'Unknown Brand';
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Campaigns</h2>
                    <p className="text-slate-500">Track active marketing initiatives and performance.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* List Section */}
                <div className="lg:col-span-2 space-y-4">
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                            <p className="text-slate-400">Loading campaigns...</p>
                        </div>
                    ) : (
                        campaigns.map(c => (
                            <div key={c.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 group relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-50 transition-opacity duration-500 pointer-events-none"></div>

                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
                                            <span className="text-xs text-indigo-600 font-bold uppercase tracking-wider">
                                                {getAdvertiserName(c.advertiser_id)}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{c.name}</h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${c.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                            c.status === 'draft' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                                'bg-amber-50 text-amber-700 border-amber-100'
                                            }`}>
                                            {c.status === 'active' ? <CheckCircle size={12} /> : <Clock size={12} />}
                                            {c.status.toUpperCase()}
                                        </span>
                                        {c.status === 'draft' && (
                                            <button
                                                onClick={() => handleStatusUpdate(c.id, 'active')}
                                                className="p-1.5 bg-emerald-50 text-emerald-600 rounded-full hover:bg-emerald-100 hover:scale-105 transition-all shadow-sm border border-emerald-100"
                                                title="Launch Campaign"
                                            >
                                                <Play size={14} fill="currentColor" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-6 pt-5 border-t border-slate-100 relative z-10">
                                    <div>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><DollarSign size={12} /> Budget</p>
                                        <p className="text-sm font-bold text-slate-900">${c.budget?.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><Calendar size={12} /> Timeline</p>
                                        <p className="text-sm font-medium text-slate-700">
                                            {c.start_date || 'TBD'} &mdash; {c.end_date || 'TBD'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><TrendingUp size={12} /> Total Revenue</p>
                                        <p className="text-sm font-bold text-emerald-600">
                                            ${(c.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Create Form */}
                <div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm sticky top-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg"><Plus size={20} /></div>
                            <h3 className="font-bold text-slate-900">New Campaign</h3>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Select Brand</label>
                                <select
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
                                    value={form.advertiser_id}
                                    onChange={e => setForm({ ...form, advertiser_id: e.target.value })}
                                    required
                                >
                                    <option value="">Choose Advertiser...</option>
                                    {advertisers.map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Campaign Title</label>
                                <input
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                                    placeholder="e.g. Summer Sale 2024"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Total Budget</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-serif italic text-lg">$</span>
                                    <input
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium placeholder:text-slate-400"
                                        placeholder="0.00"
                                        type="number"
                                        value={form.budget}
                                        onChange={e => setForm({ ...form, budget: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Start Date</label>
                                    <input type="date" className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">End Date</label>
                                    <input type="date" className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white py-3 rounded-lg text-sm font-bold transition-all duration-200 shadow-lg shadow-slate-900/20 mt-2">
                                Launch Campaign
                            </button>

                            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex gap-2 items-start mt-4">
                                <AlertCircle size={16} className="text-amber-600 mt-0.5" />
                                <p className="text-xs text-amber-800 leading-relaxed">
                                    Campaigns start in <strong>DRAFT</strong> mode. Influencers can be assigned immediately.
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
