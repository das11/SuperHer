import React, { useState, useEffect } from 'react';
import CouponList from '../components/CouponList';
import CreateCouponModal from '../components/CreateCouponModal';
import { couponsApi } from '../api/coupons';

const Coupons = () => {
    const [coupons, setCoupons] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Filters could be added here later

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        setIsLoading(true);
        try {
            const response = await couponsApi.list();
            setCoupons(response.data);
        } catch (error) {
            console.error("Failed to fetch coupons:", error);
            // Handle error state if needed
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateCoupon = async (data) => {
        // Data contains type ('auto' or 'manual') and the payload parameters
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
        // Refresh list
        await fetchCoupons();
    };

    return (
        <div className="px-4 sm:px-6 lg:px-8 py-8">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-xl font-semibold text-gray-900">Coupons</h1>
                    <p className="mt-2 text-sm text-gray-700">
                        Manage all coupons for your campaigns and influencers.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
                    >
                        Create Coupon
                    </button>
                </div>
            </div>

            <div className="mt-8 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <CouponList coupons={coupons} isLoading={isLoading} />
                    </div>
                </div>
            </div>

            <CreateCouponModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreate={handleCreateCoupon}
            />
        </div>
    );
};

export default Coupons;
