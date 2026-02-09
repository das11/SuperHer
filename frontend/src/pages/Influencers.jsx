import React, { useEffect, useState } from 'react';
import { api } from '../api/services';
import { UserPlus, Instagram, AtSign, Link as LinkIcon, CheckCircle, Search, Filter, Upload as UploadIcon } from 'lucide-react';
import BulkImportModal from '../components/BulkImportModal';

export default function Influencers() {
    const [influencers, setInfluencers] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false); // NEW STATE

    const [form, setForm] = useState({ name: '', email: '', social_handle: '' });
    const [assignmentSelections, setAssignmentSelections] = useState({});

    // ... existing fetchData ...
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [infRes, campRes] = await Promise.all([
                api.influencers.list(),
                api.campaigns.list()
            ]);
            setInfluencers(infRes.data);
            setCampaigns(campRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    // ... existing handlers ...
    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.influencers.create(form);
            setForm({ name: '', email: '', social_handle: '' });
            fetchData();
        } catch (err) {
            alert('Error: ' + (err.response?.data?.detail || err.message));
        }
    };

    const handleAssign = async (influencerId) => {
        const campaignId = assignmentSelections[influencerId];
        if (!campaignId) return alert('Select a campaign first');

        try {
            await api.influencers.assignCampaign(influencerId, parseInt(campaignId));
            setAssignmentSelections({ ...assignmentSelections, [influencerId]: '' });
            fetchData();
        } catch (err) {
            alert('Error assigning campaign');
        }
    };

    // Callback for Bulk Modal
    const handleBulkSuccess = () => {
        fetchData(); // Refresh list
    };

    return (
        <div className="space-y-6">
            <BulkImportModal
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                onSuccess={handleBulkSuccess}
                campaigns={campaigns}
            />
            {/* ... Header ... */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Influencers</h2>
                    <p className="text-slate-500">Manage talent roster and campaign assignments.</p>
                </div>
                <div className="flex gap-3">
                    {/* Search/Filter ... */}
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-500 transition-colors" size={18} />
                        <input
                            placeholder="Search influencers..."
                            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 w-64 transition-all"
                        />
                    </div>
                    <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors">
                        <Filter size={18} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Card Grid */}
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {/* ... Loading / List ... */}
                    {isLoading ? (
                        <div className="col-span-full text-center py-12">
                            <div className="animate-spin h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                            <p className="text-slate-400">Loading roster...</p>
                        </div>
                    ) : (
                        influencers.map(inf => (
                            <div key={inf.id} className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col hover:shadow-lg hover:border-purple-200 transition-all duration-300 group">
                                <div className="p-6 flex-1">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xl border-4 border-white shadow-sm ring-1 ring-slate-100 relative group-hover:scale-105 transition-transform duration-300">
                                            {inf.name.charAt(0)}
                                            {inf.campaign_links?.length > 0 && (
                                                <span className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
                                            )}
                                        </div>

                                        <div className="flex gap-1">
                                            <button className="p-1.5 text-slate-400 hover:text-purple-600 rounded-md hover:bg-purple-50 transition-colors">
                                                <Instagram size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-purple-600 transition-colors">{inf.name}</h3>
                                    <p className="text-sm text-slate-500 flex items-center gap-1.5 mb-1 font-medium">
                                        <AtSign size={14} className="text-slate-400" /> {inf.social_handle}
                                    </p>
                                    <p className="text-xs text-slate-400 mb-5">{inf.email}</p>

                                    <div className="space-y-3 pt-4 border-t border-slate-50">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                            Active Campaigns
                                        </p>
                                        {inf.campaign_links && inf.campaign_links.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {inf.campaign_links.map(link => (
                                                    <span key={link.campaign.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-bold border border-purple-100">
                                                        {link.campaign.name}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-300 italic pl-1">No active work</p>
                                        )}
                                    </div>
                                </div>

                                <div className="p-3 bg-slate-50 border-t border-slate-100 rounded-b-xl">
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <select
                                                className="w-full text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none appearance-none text-slate-600"
                                                value={assignmentSelections[inf.id] || ''}
                                                onChange={(e) => setAssignmentSelections({ ...assignmentSelections, [inf.id]: e.target.value })}
                                            >
                                                <option value="">Assign Campaign...</option>
                                                {campaigns.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleAssign(inf.id)}
                                            disabled={!assignmentSelections[inf.id]}
                                            className="p-2 bg-slate-900 text-white rounded-lg disabled:opacity-20 disabled:cursor-not-allowed hover:bg-black transition-all shadow-sm hover:shadow-md"
                                        >
                                            <LinkIcon size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Sidebar Form */}
                <div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm sticky top-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-purple-100 text-purple-700 rounded-lg"><UserPlus size={20} /></div>
                            <h3 className="font-bold text-slate-900">Onboard Talent</h3>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-4">
                            {/* ... Inputs ... */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                                <input
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all font-medium placeholder:text-slate-400"
                                    placeholder="e.g. Jane Doe"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
                                <input
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all font-medium placeholder:text-slate-400"
                                    placeholder="jane@social.com"
                                    type="email"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Instagram Handle</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Instagram size={16} /></span>
                                    <input
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all font-medium placeholder:text-slate-400"
                                        placeholder="@username"
                                        value={form.social_handle}
                                        onChange={e => setForm({ ...form, social_handle: e.target.value })}
                                    />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white py-3 rounded-lg text-sm font-bold transition-all duration-200 shadow-lg shadow-slate-900/20 mt-2">
                                Add to Roster
                            </button>
                        </form>

                        {/* BULK IMPORT BUTTON */}
                        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col items-center">
                            <span className="text-xs text-slate-400 mb-2">or import multiple at once</span>
                            <button
                                onClick={() => setIsBulkModalOpen(true)}
                                type="button"
                                className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-600 hover:text-purple-700 hover:bg-purple-50 py-2.5 rounded-lg text-sm font-bold transition-all"
                            >
                                <UploadIcon size={16} />
                                Import CSV
                            </button>
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-100">
                            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                                <div className="p-1 px-1.5 bg-white rounded text-[10px] font-bold text-purple-700 shadow-sm border border-purple-100">TIP</div>
                                <p className="text-xs text-purple-900 leading-relaxed">
                                    Use the dropdown on each card to quickly assign influencers to active campaigns.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
