import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { api } from '../../api/services';
import { Key, Plus, Trash2, Copy, Check, AlertTriangle, Shield, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function ApiKeyManager({ advertiserId, keys, onKeysUpdated }) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [createdKey, setCreatedKey] = useState(null); // { api_key: '...', name: '...' }
    const [isLoading, setIsLoading] = useState(false);
    const [isRevoking, setIsRevoking] = useState(null); // keyId being revoked

    const handleCreateKey = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            // Corrected method name and argument usage based on services.js
            const res = await api.advertisers.generateKey(advertiserId, newKeyName || 'New API Key');
            setCreatedKey(res.data); // Should return { api_key, name, message }
            onKeysUpdated(); // Refresh parent list
        } catch (err) {
            console.error("Failed to create key", err);
            // Show error notification (omitted for brevity)
        } finally {
            setIsLoading(false);
        }
    };

    const handleRevokeKey = async (keyId) => {
        if (!window.confirm("Are you sure? This action cannot be undone and any systems using this key will stop working.")) return;

        setIsRevoking(keyId);
        try {
            await api.advertisers.deleteKey(advertiserId, keyId);
            onKeysUpdated();
        } catch (err) {
            console.error("Failed to revoke key", err);
        } finally {
            setIsRevoking(null);
        }
    };

    const closeCreateModal = () => {
        setIsCreateModalOpen(false);
        setCreatedKey(null);
        setNewKeyName('');
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Key size={18} className="text-slate-400" />
                        API Keys
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage authentication keys for integrating with the Event Ingestion API.
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
                >
                    <Plus size={16} />
                    Create New Key
                </button>
            </div>

            {/* Keys Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Key Token</th>
                            <th className="px-6 py-4">Created</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {keys.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-8 text-center text-slate-500">
                                    No API keys found. Create one to get started.
                                </td>
                            </tr>
                        ) : (
                            keys.map((key) => (
                                <tr key={key.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">{key.name || 'Untitled Key'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded w-fit border border-slate-200">
                                            <span>{key.key_prefix}</span>
                                            <span className="text-slate-400 tracking-widest">••••••••••••••••••••••••</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {format(new Date(key.created_at), 'MMM d, yyyy')}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleRevokeKey(key.id)}
                                            disabled={isRevoking === key.id}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Revoke Key"
                                        >
                                            {isRevoking === key.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Key Modal */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
                        >
                            {!createdKey ? (
                                // CREATE FORM
                                <form onSubmit={handleCreateKey} className="p-6">
                                    <h3 className="text-lg font-bold text-slate-900 mb-2">Create New API Key</h3>
                                    <p className="text-sm text-slate-500 mb-6">
                                        Enter a name for this key to help you identify it later (e.g., "Production", "Dev Laptop").
                                    </p>

                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Key Name</label>
                                        <input
                                            type="text"
                                            value={newKeyName}
                                            onChange={(e) => setNewKeyName(e.target.value)}
                                            placeholder="e.g. Supabase Integration"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                            autoFocus
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={closeCreateModal}
                                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {isLoading && <Loader2 size={16} className="animate-spin" />}
                                            Generate Key
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                // SHOW KEY (ONCE)
                                <div className="p-6">
                                    <div className="flex items-center gap-3 text-emerald-600 mb-4">
                                        <div className="p-2 bg-emerald-50 rounded-full">
                                            <Check size={20} />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900">Key Generated!</h3>
                                    </div>

                                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mb-6 flex gap-3 text-sm text-amber-800">
                                        <AlertTriangle className="shrink-0 mt-0.5" size={16} />
                                        <p>
                                            Please copy this key immediately. <strong>We cannot verify or show it to you again.</strong>
                                        </p>
                                    </div>

                                    <div className="relative mb-6">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Your API Key</label>
                                        <div className="flex items-center gap-2">
                                            <code className="flex-1 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 font-mono text-sm break-all text-slate-800">
                                                {createdKey.api_key}
                                            </code>
                                            <CopyButton text={createdKey.api_key} />
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            onClick={closeCreateModal}
                                            className="w-full px-4 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
                                        >
                                            I have saved this key
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Helper
const CopyButton = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button
            onClick={handleCopy}
            className="p-2.5 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 rounded-lg transition-all"
        >
            {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
        </button>
    );
};
