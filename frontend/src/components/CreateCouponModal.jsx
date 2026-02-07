import React, { useState, useEffect } from 'react';
import { api } from '../api/services';
import { X, Tag, Wand2, PenLine, AlertTriangle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CreateCouponModal = ({ isOpen, onClose, onCreate }) => {
    const [activeTab, setActiveTab] = useState('auto'); // 'auto' or 'manual'
    const [campaigns, setCampaigns] = useState([]);
    const [influencers, setInfluencers] = useState([]);
    const [loadingConfig, setLoadingConfig] = useState(false);

    // Form State
    const [campaignId, setCampaignId] = useState('');
    const [influencerId, setInfluencerId] = useState(''); // Empty string = Generic

    // Auto Params
    const [prefix, setPrefix] = useState('');
    const [length, setLength] = useState(8);

    // Manual Params
    const [manualCode, setManualCode] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchConfig();
            // Reset form
            setCampaignId('');
            setInfluencerId('');
            setPrefix('');
            setLength(8);
            setManualCode('');
            setError(null);
            setIsSubmitting(false);
        }
    }, [isOpen]);

    const fetchConfig = async () => {
        setLoadingConfig(true);
        try {
            const [campaignsRes, influencersRes] = await Promise.all([
                api.campaigns.list(),
                api.influencers.list()
            ]);
            setCampaigns(campaignsRes.data);
            setInfluencers(influencersRes.data);
        } catch (err) {
            console.error("Failed to load options", err);
            setError("Failed to load campaigns or influencers.");
        } finally {
            setLoadingConfig(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        if (!campaignId) {
            setError("Please select a campaign.");
            setIsSubmitting(false);
            return;
        }

        try {
            const commonData = {
                campaign_id: parseInt(campaignId),
                influencer_id: influencerId ? parseInt(influencerId) : null,
                is_active: true
            };

            if (activeTab === 'manual') {
                if (!manualCode.trim()) {
                    setError("Please enter a coupon code.");
                    setIsSubmitting(false);
                    return;
                }
                await onCreate({
                    ...commonData,
                    type: 'manual',
                    code: manualCode
                });
            } else {
                await onCreate({
                    ...commonData,
                    type: 'auto',
                    generation_params: {
                        prefix: prefix,
                        length: length
                    }
                });
            }
            onClose();
        } catch (err) {
            console.error("Creation failed", err);
            // Try to extract error message from API response
            const msg = err.response?.data?.detail || "Failed to create coupon. Code might already exist.";
            setError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
                                    <Tag size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">Create Coupon</h3>
                                    <p className="text-sm text-slate-500">Generate a new discount code</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Loading State for Config */}
                        {loadingConfig ? (
                            <div className="p-12 text-center text-slate-400">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-500" />
                                <p>Loading configuration...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                {/* Error Display */}
                                {error && (
                                    <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 text-sm font-medium border border-red-100">
                                        <AlertTriangle className="shrink-0 mt-0.5" size={16} />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {/* Mode Selection Tabs */}
                                <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('auto')}
                                        className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'auto'
                                                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5'
                                                : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-700'
                                            }`}
                                    >
                                        <Wand2 size={16} /> Auto-Generate
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('manual')}
                                        className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'manual'
                                                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5'
                                                : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-700'
                                            }`}
                                    >
                                        <PenLine size={16} /> Manual
                                    </button>
                                </div>

                                <div className="space-y-5">
                                    {/* Campaign Select */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campaign</label>
                                        <div className="relative">
                                            <select
                                                value={campaignId}
                                                onChange={(e) => setCampaignId(e.target.value)}
                                                className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none"
                                            >
                                                <option value="">Select a campaign...</option>
                                                {campaigns.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Influencer Select */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Influencer (Optional)</label>
                                        <div className="relative">
                                            <select
                                                value={influencerId}
                                                onChange={(e) => setInfluencerId(e.target.value)}
                                                className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none"
                                            >
                                                <option value="">Generic (No Influencer Assigned)</option>
                                                {influencers.map(i => (
                                                    <option key={i.id} value={i.id}>{i.name} ({i.social_handle})</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Auto Config */}
                                    {activeTab === 'auto' && (
                                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Prefix</label>
                                                <input
                                                    type="text"
                                                    value={prefix}
                                                    onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                                                    placeholder="e.g. SUMMER"
                                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-mono uppercase placeholder:normal-case"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Length: {length}</label>
                                                <input
                                                    type="range"
                                                    min="4"
                                                    max="20"
                                                    value={length}
                                                    onChange={(e) => setLength(e.target.value)}
                                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                />
                                                <div className="flex justify-between text-xs text-slate-400 mt-1 font-mono">
                                                    <span>4 chars</span>
                                                    <span>20 chars</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Manual Config */}
                                    {activeTab === 'manual' && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Coupon Code</label>
                                            <input
                                                type="text"
                                                value={manualCode}
                                                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                                                placeholder="ENTER_CODE"
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 font-mono uppercase"
                                                autoFocus
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Footer Actions */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-[2] px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting && <Loader2 className="animate-spin w-4 h-4" />}
                                        {isSubmitting ? 'Creating...' : 'Create Coupon'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CreateCouponModal;
