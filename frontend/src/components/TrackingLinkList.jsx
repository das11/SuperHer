import React, { useState } from 'react';
import { Copy, Check, Search, ExternalLink, Info, Mail, Loader } from 'lucide-react';
import { trackingApi } from '../api/tracking';
import EmailSuccessModal from './EmailSuccessModal';

const TrackingLinkList = ({ links, isLoading }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [copiedId, setCopiedId] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [isSending, setIsSending] = useState(false);
    const [notificationResult, setNotificationResult] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const handleCopy = (shortCode, id) => {
        const fullUrl = `${window.location.protocol}//${window.location.hostname}:8000/api/v1/r/${shortCode}`;
        navigator.clipboard.writeText(fullUrl);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Filter Logic
    const filteredLinks = links.filter(link =>
        link.short_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.destination_url.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const isAllSelected = filteredLinks.length > 0 && selectedIds.size === filteredLinks.length;

    const handleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredLinks.map(l => l.id)));
        }
    };

    const handleSelectOne = (id) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };
    const handleSendEmails = async () => {
        if (selectedIds.size === 0) return;
        setIsSending(true);
        try {
            const res = await trackingApi.notify({
                ids: Array.from(selectedIds),
                send_all: false
            });
            const data = res.data;
            setNotificationResult(data);
            setShowModal(true);
            setSelectedIds(new Set());
        } catch (error) {
            console.error(error);
            setNotificationResult({
                message: "Failed to connect to the server.",
                emails_sent: 0,
                emails_failed: selectedIds.size,
                influencers_targeted: 0
            });
            setShowModal(true);
        } finally {
            setIsSending(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-400 text-sm">Loading links...</p>
            </div>
        );
    }

    return (
        <div>
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex gap-4 items-center justify-between">
                <div className="flex gap-4 items-center flex-1">
                    <div className="relative group max-w-xs w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-500 transition-colors" size={16} />
                        <input
                            placeholder="Search short code or destination..."
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        <span className="text-sm font-medium text-slate-600">{selectedIds.size} selected</span>
                        <button
                            onClick={handleSendEmails}
                            disabled={isSending}
                            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm shadow-purple-200 disabled:opacity-70"
                        >
                            {isSending ? <Loader className="animate-spin" size={16} /> : <Mail size={16} />}
                            Send to Influencers
                        </button>
                    </div>
                )}
            </div>

            {/* Empty State */}
            {!isLoading && filteredLinks.length === 0 && (
                <div className="text-center py-16 bg-white">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="text-slate-300" size={24} />
                    </div>
                    <p className="text-slate-500 font-medium">No links found matching your criteria.</p>
                    <button onClick={() => setSearchTerm('')} className="mt-2 text-purple-600 text-sm font-bold hover:underline">
                        Clear filters
                    </button>
                </div>
            )}

            {/* Table */}
            {filteredLinks.length > 0 && (
                <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <th className="px-6 py-4 w-10">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        onChange={handleSelectAll}
                                        className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                    />
                                </th>
                                <th className="px-6 py-4">Short Code</th>
                                <th className="px-6 py-4">Total Clicks</th>
                                <th className="px-6 py-4">Destination</th>
                                <th className="px-6 py-4">Campaign</th>
                                <th className="px-6 py-4">Influencer</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredLinks.map((link) => (
                                <tr key={link.id} className={`hover:bg-slate-50/80 transition-colors group ${selectedIds.has(link.id) ? 'bg-purple-50/50' : ''}`}>
                                    <td className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(link.id)}
                                            onChange={() => handleSelectOne(link.id)}
                                            className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200 group-hover:border-purple-200 group-hover:bg-purple-50 group-hover:text-purple-700 transition-colors">
                                                {link.short_code}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900">{link.click_count || 0}</span>
                                            <span className="text-xs text-slate-400">clicks</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        <div className="flex items-center gap-1.5 max-w-[200px] truncate" title={link.destination_url}>
                                            <ExternalLink size={12} />
                                            <span className="truncate">{link.destination_url}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                                        <div className="flex items-center gap-1.5 group/tooltip relative">
                                            <span className="truncate max-w-[120px]">{link.campaign?.name || 'Unknown'}</span>
                                            <Info size={14} className="text-slate-300 hover:text-slate-500 cursor-help" />
                                            {/* Tooltip */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                                ID: {link.campaign_id}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {link.influencer ? (
                                            <div className="flex items-center gap-1.5 group/tooltip relative">
                                                <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                                                    {link.influencer.name.charAt(0)}
                                                </div>
                                                <span className="truncate max-w-[120px]">{link.influencer.name}</span>
                                                <Info size={14} className="text-slate-300 hover:text-slate-500 cursor-help" />

                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                                    ID: {link.influencer_id}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 italic">Generic</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleCopy(link.short_code, link.id)}
                                            className={`p-2 rounded-lg transition-all ${copiedId === link.id
                                                ? 'text-emerald-600 bg-emerald-50'
                                                : 'text-slate-400 hover:text-purple-600 hover:bg-purple-50'
                                                }`}
                                            title="Copy Tracking Link"
                                        >
                                            {copiedId === link.id ? <Check size={16} /> : <Copy size={16} />}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {/* Modal */}
            <EmailSuccessModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                results={notificationResult}
            />
        </div>
    );
};

export default TrackingLinkList;
