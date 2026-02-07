import React, { useEffect, useState } from 'react';
import { api } from '../api/services';
import { Plus, Key, CheckCircle, Search, Filter, X, Copy, AlertTriangle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function Advertisers() {
    const { user } = useAuth();
    const [advertisers, setAdvertisers] = useState([]);
    const [form, setForm] = useState({ name: '', contact_email: '' });
    const [generatedKey, setGeneratedKey] = useState(null); // { key: '...', name: '...' }
    const [deleteConfirmation, setDeleteConfirmation] = useState(null); // { advId, keyId }
    const [deleteAdvertiserConfirmation, setDeleteAdvertiserConfirmation] = useState(null); // { advId, name }
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchAdvertisers();
    }, []);

    const fetchAdvertisers = async () => {
        setIsLoading(true);
        try {
            const res = await api.advertisers.list();
            setAdvertisers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.advertisers.create({ ...form, is_active: true });
            setForm({ name: '', contact_email: '' });
            fetchAdvertisers();
        } catch (err) {
            alert('Error creating advertiser');
        }
    };

    const handleGenerateKey = async (adv) => {
        const confirmMsg = adv.api_keys?.length > 0
            ? `Connect specific API key for ${adv.name}? This will add a NEW key.`
            : `Generate API key for ${adv.name}?`;

        if (!window.confirm(confirmMsg)) return;

        const keyName = window.prompt("Enter a name for this API key (optional):");

        try {
            const res = await api.advertisers.generateKey(adv.id, keyName);
            setGeneratedKey({ key: res.data.api_key, name: adv.name, keyName: res.data.name });
            fetchAdvertisers();
        } catch (err) {
            alert('Error generating key');
        }
    };

    const handleDeleteKey = (advId, keyId) => {
        setDeleteConfirmation({ advId, keyId });
    };

    const confirmDeleteKey = async () => {
        if (!deleteConfirmation) return;
        const { advId, keyId } = deleteConfirmation;
        try {
            await api.advertisers.deleteKey(advId, keyId);
            setDeleteConfirmation(null);
            fetchAdvertisers();
        } catch (err) {
            alert('Error deleting key');
        }
    };

    const confirmDeleteAdvertiser = async () => {
        if (!deleteAdvertiserConfirmation) return;
        const { advId } = deleteAdvertiserConfirmation;
        try {
            // Call delete endpoint
            await api.advertisers.delete(advId);
            setDeleteAdvertiserConfirmation(null);
            fetchAdvertisers();
        } catch (err) {
            console.error(err);
            if (err.response && err.response.status === 404) {
                alert('Advertiser no longer exists. Refreshing list...');
                setDeleteAdvertiserConfirmation(null);
                fetchAdvertisers();
            } else if (err.response && err.response.status === 409) {
                // The backend now sends specific details for 409
                alert(err.response.data.detail || 'Cannot delete: Dependencies exist.');
            } else {
                alert('Error deleting advertiser. Please try again.');
            }
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert("Copied to clipboard!");
    };

    return (
        <div className="space-y-6 relative">

            {/* Modal for New Key */}
            <AnimatePresence>
                {generatedKey && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setGeneratedKey(null)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full relative z-10"
                        >
                            <button
                                onClick={() => setGeneratedKey(null)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                            >
                                <X size={20} />
                            </button>

                            <div className="flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                                    <Key size={32} />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">API Key Generated</h3>
                                <p className="text-gray-500 mb-6">
                                    Successfully generated a new key for <span className="font-semibold text-gray-900">{generatedKey.name}</span>.
                                    {generatedKey.keyName && <div className="mt-1 text-sm font-medium text-blue-600">"{generatedKey.keyName}"</div>}
                                    <br /><span className="text-red-500 text-sm font-medium">Copy this now. It will not be shown again.</span>
                                </p>

                                <div className="w-full bg-slate-900 rounded-xl p-4 mb-6 relative group group-hover:bg-slate-800 transition-colors">
                                    <code className="text-emerald-400 font-mono text-sm break-all">
                                        {generatedKey.key}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(generatedKey.key)}
                                        className="absolute right-2 top-2 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                                        title="Copy"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>

                                <button
                                    onClick={() => setGeneratedKey(null)}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all"
                                >
                                    I have saved the key
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal for Delete Confirmation (API Key) */}
            <AnimatePresence>
                {deleteConfirmation && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setDeleteConfirmation(null)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full relative z-10"
                        >
                            <div className="flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                                    <Trash2 size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Delete API Key?</h3>
                                <p className="text-gray-500 mb-6">
                                    Are you sure you want to delete this API Key? This action cannot be undone.
                                </p>
                                <div className="flex gap-3 w-full">
                                    <button
                                        onClick={() => setDeleteConfirmation(null)}
                                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmDeleteKey}
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal for Delete Confirmation (Advertiser) */}
            <AnimatePresence>
                {deleteAdvertiserConfirmation && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setDeleteAdvertiserConfirmation(null)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full relative z-10"
                        >
                            <div className="flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                                    <AlertTriangle size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Advertiser?</h3>
                                <p className="text-gray-500 mb-2">
                                    Delete <strong>{deleteAdvertiserConfirmation.name}</strong>?
                                </p>
                                <p className="text-sm text-red-500 font-semibold mb-6">
                                    This will permanently delete all associated campaigns, events, and API keys. This cannot be undone.
                                </p>
                                <div className="flex gap-3 w-full">
                                    <button
                                        onClick={() => setDeleteAdvertiserConfirmation(null)}
                                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmDeleteAdvertiser}
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all"
                                    >
                                        Delete Forever
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Advertisers</h2>
                    <p className="text-slate-500">Manage brands and their API access tokens.</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input
                            placeholder="Search brands..."
                            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-64 transition-all"
                        />
                    </div>
                    <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500">
                        <Filter size={18} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* List Section */}
                <div className="lg:col-span-2 space-y-4">
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                            <p className="text-slate-400">Loading brands...</p>
                        </div>
                    ) : (
                        advertisers.map(adv => (
                            <div key={adv.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 group">
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-4">
                                        <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center text-blue-600 font-bold text-lg border border-blue-100 shadow-inner">
                                            {adv.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                                                {adv.name}
                                                {adv.is_active && <CheckCircle size={14} className="text-emerald-500" />}
                                                {!adv.is_active && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">Inactive</span>}
                                            </h3>
                                            <p className="text-sm text-slate-500 font-medium">{adv.contact_email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleGenerateKey(adv)}
                                            className="text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 bg-white px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all shadow-sm"
                                        >
                                            <Key size={14} className="text-slate-400" /> New Key
                                        </button>

                                        {user?.role === 'SUPERROOT' && (
                                            <button
                                                onClick={() => setDeleteAdvertiserConfirmation({ advId: adv.id, name: adv.name })}
                                                className="text-xs font-semibold text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all shadow-sm group/del"
                                                title="Delete Advertiser"
                                            >
                                                <Trash2 size={14} className="group-hover/del:text-red-500" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {adv.api_keys && adv.api_keys.length > 0 ? (
                                    <div className="mt-5 pt-4 border-t border-slate-50">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Keys ({adv.api_keys.length})</h4>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {adv.api_keys.map(k => (
                                                <div key={k.id} className="flex items-center justify-between text-xs bg-slate-50 text-slate-600 px-3 py-2 rounded-md font-mono border border-slate-100 group/key">
                                                    <div className="flex flex-col gap-0.5">
                                                        {k.name && <span className="font-sans font-bold text-slate-700">{k.name}</span>}
                                                        <span className="flex items-center gap-2 overflow-hidden">
                                                            <span className="text-slate-400 shrink-0">PREFIX</span>
                                                            <span className="font-bold text-slate-700">{k.key_prefix}••••</span>
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {k.is_active && <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Active"></span>}
                                                        <button
                                                            onClick={() => handleDeleteKey(adv.id, k.id)}
                                                            className="text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover/key:opacity-100"
                                                            title="Delete Key"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-4 pt-4 border-t border-slate-50 text-xs text-orange-400 flex items-center gap-1">
                                        <AlertTriangle size={12} /> No active API keys
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Create Form Section - Only for SuperRoot */}
                {user?.role === 'SUPERROOT' && (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm sticky top-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg"><Plus size={20} /></div>
                                <h3 className="font-bold text-slate-900">New Advertiser</h3>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Brand Name</label>
                                    <input
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                                        placeholder="e.g. Acme Corp"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Contact Email</label>
                                    <input
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                                        placeholder="brand@example.com"
                                        type="email"
                                        value={form.contact_email}
                                        onChange={e => setForm({ ...form, contact_email: e.target.value })}
                                        required
                                    />
                                </div>
                                <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white py-3 rounded-lg text-sm font-bold transition-all duration-200 shadow-lg shadow-slate-900/20 mt-2">
                                    Create Brand
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
