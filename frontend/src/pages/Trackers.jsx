import React, { useState, useEffect } from 'react';
import { Ticket, Link as LinkIcon, Plus, LayoutGrid, List as ListIcon, Search, Filter } from 'lucide-react';
import CouponList from '../components/CouponList';
import TrackingLinkList from '../components/TrackingLinkList';
import CreateCouponModal from '../components/CreateCouponModal';
import CreateTrackingLinkModal from '../components/CreateTrackingLinkModal';
import { couponsApi } from '../api/coupons';
import { trackingApi } from '../api/tracking';

export default function Trackers() {
    const [activeTab, setActiveTab] = useState('coupons'); // 'coupons' or 'links'
    const [coupons, setCoupons] = useState([]);
    const [links, setLinks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modals
    const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'coupons') {
                const res = await couponsApi.list();
                setCoupons(res.data);
            } else {
                const res = await trackingApi.list();
                setLinks(res.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateCoupon = async (data) => {
        try {
            if (data.type === 'manual') {
                await couponsApi.createManual({
                    campaign_id: data.campaign_id,
                    influencer_id: data.influencer_id,
                    code: data.code,
                    is_active: data.is_active
                });
            } else {
                await couponsApi.generate({
                    campaign_id: data.campaign_id,
                    influencer_id: data.influencer_id,
                    generation_params: data.generation_params,
                    is_active: data.is_active
                });
            }
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Failed to create coupon");
        }
    };

    const handleCreateLink = async (data) => {
        try {
            await trackingApi.create(data);
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Failed to create link");
        }
    };

    return (
        <div className="space-y-6">
            <CreateCouponModal isOpen={isCouponModalOpen} onClose={() => setIsCouponModalOpen(false)} onCreate={handleCreateCoupon} />
            <CreateTrackingLinkModal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} onCreate={handleCreateLink} />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Trackers</h1>
                    <p className="text-slate-500">Manage attribution links and discount codes.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex p-1 bg-slate-100 rounded-lg">
                        <button
                            onClick={() => setActiveTab('coupons')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'coupons' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Ticket size={16} />
                            Coupons
                        </button>
                        <button
                            onClick={() => setActiveTab('links')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'links' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <LinkIcon size={16} />
                            Links
                        </button>
                    </div>

                    <button
                        onClick={() => activeTab === 'coupons' ? setIsCouponModalOpen(true) : setIsLinkModalOpen(true)}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-all shadow-lg shadow-slate-900/20"
                    >
                        <Plus size={18} />
                        Create {activeTab === 'coupons' ? 'Coupon' : 'Link'}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                {/* Shared Toolbar (Search/Filter placeholders) can go here */}

                <div className="p-0">
                    {activeTab === 'coupons' ? (
                        <CouponList coupons={coupons} isLoading={isLoading} />
                    ) : (
                        <TrackingLinkList links={links} isLoading={isLoading} />
                    )}
                </div>
            </div>
        </div>
    );
}
