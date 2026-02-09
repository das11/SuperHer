import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/services';
import { ChevronLeft, Save, DollarSign, Percent, User, Mail, Search, CheckCircle, AlertCircle } from 'lucide-react';

export default function CampaignSettings() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [campaign, setCampaign] = useState(null);
    const [influencers, setInfluencers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [savingId, setSavingId] = useState(null); // ID of influencer currently being saved

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            const [campRes, infRes] = await Promise.all([
                api.campaigns.get(id),
                api.campaigns.listInfluencers(id)
            ]);
            setCampaign(campRes.data);
            setInfluencers(infRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdate = async (influencerId, field, value) => {
        // Optimistic update
        const updatedInfluencers = influencers.map(inf =>
            inf.id === influencerId ? { ...inf, [field]: value } : inf
        );
        setInfluencers(updatedInfluencers);
    };

    const saveSettings = async (influencer) => {
        setSavingId(influencer.id);
        try {
            await api.influencers.assignCampaign(influencer.id, id, {
                revenue_share_value: parseFloat(influencer.revenue_share_value || 0),
                revenue_share_type: influencer.revenue_share_type
            });
            // Show success toast or visual feedback?
            // Button will revert to "Save"/Check automatically once savingId is null
        } catch (err) {
            alert('Failed to save settings');
            console.error(err);
        } finally {
            setSavingId(null);
        }
    };

    const filteredInfluencers = influencers.filter(inf =>
        inf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inf.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!campaign) return <div className="p-8 text-center">Campaign not found</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/campaigns')}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-900"
                >
                    <ChevronLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{campaign.name}</h1>
                    <p className="text-slate-500 text-sm">Campaign Settings & Revenue Share</p>
                </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Influencer Revenue Models</h2>
                        <p className="text-sm text-slate-500 mt-1">Configure payout structures for each influencer.</p>
                    </div>
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search influencers..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                <th className="px-6 py-4">Influencer</th>
                                <th className="px-6 py-4">Revenue Model</th>
                                <th className="px-6 py-4">Value</th>
                                <th className="px-6 py-4">Est. Action</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredInfluencers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                                        No influencers found for this campaign.
                                    </td>
                                </tr>
                            ) : (
                                filteredInfluencers.map(inf => (
                                    <tr key={inf.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                                                    {inf.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 text-sm">{inf.name}</p>
                                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                                        <Mail size={10} /> {inf.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1 w-fit">
                                                <button
                                                    onClick={() => handleUpdate(inf.id, 'revenue_share_type', 'percentage')}
                                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${inf.revenue_share_type === 'percentage'
                                                            ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                                                            : 'text-slate-500 hover:text-slate-700'
                                                        }`}
                                                >
                                                    <Percent size={12} /> Percentage
                                                </button>
                                                <button
                                                    onClick={() => handleUpdate(inf.id, 'revenue_share_type', 'flat')}
                                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${inf.revenue_share_type === 'flat'
                                                            ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                                                            : 'text-slate-500 hover:text-slate-700'
                                                        }`}
                                                >
                                                    <DollarSign size={12} /> Flat Fee
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="relative max-w-[120px]">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">
                                                    {inf.revenue_share_type === 'percentage' ? '%' : '$'}
                                                </span>
                                                <input
                                                    type="number"
                                                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                                    value={inf.revenue_share_value}
                                                    onChange={(e) => handleUpdate(inf.id, 'revenue_share_value', e.target.value)}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-medium text-slate-500">
                                                {inf.revenue_share_type === 'percentage'
                                                    ? 'Per sale amount'
                                                    : 'Per conversion event'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => saveSettings(inf)}
                                                disabled={savingId === inf.id}
                                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${savingId === inf.id
                                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20'
                                                    }`}
                                            >
                                                {savingId === inf.id ? (
                                                    <>Saving...</>
                                                ) : (
                                                    <><Save size={16} /> Save</>
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
                    <p>Changes must be saved individually.</p>
                    <p className="flex items-center gap-1"><AlertCircle size={12} /> Revenue share impacts future attribution only.</p>
                </div>
            </div>
        </div>
    );
}
