import React, { useState } from 'react';
import { Copy, Check, Search, Filter, Info, Mail, Loader } from 'lucide-react';
import { couponsApi } from '../api/coupons';
import EmailSuccessModal from './EmailSuccessModal';

const CouponList = ({ coupons, isLoading }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive
    const [copiedId, setCopiedId] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [isSending, setIsSending] = useState(false);
    const [notificationResult, setNotificationResult] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const handleCopy = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Filter Logic
    const filteredCoupons = coupons.filter(coupon => {
        const matchesSearch = coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (coupon.campaign?.name.toLowerCase() || '').includes(searchTerm) ||
            (coupon.campaign_id?.toString() || '').includes(searchTerm);
        const matchesStatus = statusFilter === 'all'
            ? true
            : statusFilter === 'active' ? coupon.is_active : !coupon.is_active;

        return matchesSearch && matchesStatus;
    });

    const isAllSelected = filteredCoupons.length > 0 && selectedIds.size === filteredCoupons.length;

    const handleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredCoupons.map(c => c.id)));
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
            const res = await couponsApi.notify({
                ids: Array.from(selectedIds),
                send_all: false
            });
            const data = res.data;
            setNotificationResult(data);
            setShowModal(true);
            setSelectedIds(new Set());
        } catch (error) {
            console.error(error);
            // Fallback for network error
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
                <p className="text-slate-400 text-sm">Loading coupons...</p>
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
                            placeholder="Search code or campaign..."
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="relative">
                        <select
                            className="appearance-none bg-white border border-slate-200 pl-4 pr-10 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-600 font-medium"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <Filter size={14} />
                        </div>
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
            {!isLoading && filteredCoupons.length === 0 && (
                <div className="text-center py-16 bg-white">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="text-slate-300" size={24} />
                    </div>
                    <p className="text-slate-500 font-medium">No coupons found matching your criteria.</p>
                    <button onClick={() => { setSearchTerm(''); setStatusFilter('all') }} className="mt-2 text-purple-600 text-sm font-bold hover:underline">
                        Clear filters
                    </button>
                </div>
            )}

            {/* Table */}
            {filteredCoupons.length > 0 && (
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
                                <th className="px-6 py-4">Coupon Code</th>
                                <th className="px-6 py-4">Campaign</th>
                                <th className="px-6 py-4">Influencer</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Created</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredCoupons.map((coupon) => (
                                <tr key={coupon.id} className={`hover:bg-slate-50/80 transition-colors group ${selectedIds.has(coupon.id) ? 'bg-purple-50/50' : ''}`}>
                                    <td className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(coupon.id)}
                                            onChange={() => handleSelectOne(coupon.id)}
                                            className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200 group-hover:border-purple-200 group-hover:bg-purple-50 group-hover:text-purple-700 transition-colors">
                                                {coupon.code}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                                        <div className="flex items-center gap-1.5 group/tooltip relative">
                                            <span className="truncate max-w-[120px]">{coupon.campaign?.name || 'Unknown'}</span>
                                            <Info size={14} className="text-slate-300 hover:text-slate-500 cursor-help" />
                                            {/* Tooltip */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                                ID: {coupon.campaign_id}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {coupon.influencer ? (
                                            <div className="flex items-center gap-1.5 group/tooltip relative">
                                                <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                                                    {coupon.influencer.name.charAt(0)}
                                                </div>
                                                <span className="truncate max-w-[120px]">{coupon.influencer.name}</span>
                                                <Info size={14} className="text-slate-300 hover:text-slate-500 cursor-help" />

                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                                    ID: {coupon.influencer_id}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 italic">Generic</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${coupon.is_active
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                            : 'bg-slate-100 text-slate-500 border-slate-200'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${coupon.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                            {coupon.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-400">
                                        {new Date(coupon.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleCopy(coupon.code, coupon.id)}
                                            className={`p-2 rounded-lg transition-all ${copiedId === coupon.id
                                                ? 'text-emerald-600 bg-emerald-50'
                                                : 'text-slate-400 hover:text-purple-600 hover:bg-purple-50'
                                                }`}
                                            title="Copy Code"
                                        >
                                            {copiedId === coupon.id ? <Check size={16} /> : <Copy size={16} />}
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

export default CouponList;
