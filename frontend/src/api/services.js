import client from './client';

export const api = {
    advertisers: {
        list: () => client.get('/advertisers/'),
        create: (data) => client.post('/advertisers/', data),
        get: (id) => client.get(`/advertisers/${id}`),
        update: (id, data) => client.patch(`/advertisers/${id}`, data),
        generateKey: (id, name) => client.post(`/advertisers/${id}/api-key`, { name }),
        deleteKey: (advertiserId, keyId) => client.delete(`/advertisers/${advertiserId}/api-key/${keyId}`),
        delete: (id) => client.delete(`/advertisers/${id}`),
    },
    campaigns: {
        list: (params) => client.get('/campaigns/', { params }),
        create: (data) => client.post('/campaigns/', data),
        get: (id) => client.get(`/campaigns/${id}`),
        update: (id, data) => client.patch(`/campaigns/${id}`, data),
        listInfluencers: (id) => client.get(`/campaigns/${id}/influencers`),
    },
    influencers: {
        list: (params) => client.get('/influencers/', { params }),
        create: (data) => client.post('/influencers/', data),
        get: (id) => client.get(`/influencers/${id}`),
        assignCampaign: (influencerId, campaignId, revenueData = {}) =>
            client.post(`/influencers/${influencerId}/campaigns`, { campaign_id: campaignId, ...revenueData }),
    },
};
