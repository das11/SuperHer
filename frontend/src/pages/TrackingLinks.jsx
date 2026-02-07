import React, { useState, useEffect } from 'react';
import TrackingLinkList from '../components/TrackingLinkList';
import CreateTrackingLinkModal from '../components/CreateTrackingLinkModal';
import { trackingApi } from '../api/tracking';

const TrackingLinks = () => {
    const [links, setLinks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchLinks();
    }, []);

    const fetchLinks = async () => {
        setIsLoading(true);
        try {
            const response = await trackingApi.list();
            setLinks(response.data);
        } catch (error) {
            console.error("Failed to fetch links:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateLink = async (data) => {
        await trackingApi.create(data);
        await fetchLinks();
    };

    return (
        <div className="px-4 sm:px-6 lg:px-8 py-8">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-xl font-semibold text-gray-900">Tracking Links</h1>
                    <p className="mt-2 text-sm text-gray-700">
                        Create short links for your campaigns and influencers. Monitor clicks in real-time.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
                    >
                        Create Link
                    </button>
                </div>
            </div>

            <div className="mt-8 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <TrackingLinkList links={links} isLoading={isLoading} />
                    </div>
                </div>
            </div>

            <CreateTrackingLinkModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreate={handleCreateLink}
            />
        </div>
    );
};

export default TrackingLinks;
