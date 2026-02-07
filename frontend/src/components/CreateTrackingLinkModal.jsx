import React, { useState, useEffect } from 'react';
import { api } from '../api/services';
import { X, Link2, AlertTriangle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CreateTrackingLinkModal = ({ isOpen, onClose, onCreate }) => {
    const [campaigns, setCampaigns] = useState([]);
    const [influencers, setInfluencers] = useState([]);
    const [loadingConfig, setLoadingConfig] = useState(false);

    // Form State
    const [destinationUrl, setDestinationUrl] = useState('');
    const [campaignId, setCampaignId] = useState('');
    const [influencerId, setInfluencerId] = useState(''); // Empty string = Generic
    const [cpcRate, setCpcRate] = useState(0);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchConfig();
            // Reset form
            setDestinationUrl('');
            setCampaignId('');
            setInfluencerId('');
            setCpcRate(0);
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

        if (!destinationUrl) {
            setError("Please enter a destination URL.");
            setIsSubmitting(false);
            return;
        }

        try {
            await onCreate({
                destination_url: destinationUrl,
                campaign_id: parseInt(campaignId),
                influencer_id: influencerId ? parseInt(influencerId) : null,
                cpc_rate: parseFloat(cpcRate)
            });
            onClose();
        } catch (err) {
            console.error("Creation failed", err);
            setError(err.response?.data?.detail || "Failed to create tracking link.");
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
                                    <Link2 size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">Create Link</h3>
                                    <p className="text-sm text-slate-500">New tracking URL for campaign</p>
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

                                <div className="space-y-5">
                                    {/* Destination URL */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Destination URL</label>
                                        <input
                                            type="url"
                                            value={destinationUrl}
                                            onChange={(e) => setDestinationUrl(e.target.value)}
                                            placeholder="https://myshop.com/product"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                            required
                                            autoFocus
                                        />
                                    </div>

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
                                        {isSubmitting ? 'Creating...' : 'Create Link'}
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

export default CreateTrackingLinkModal;
