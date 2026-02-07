import client from './client';

export const statsApi = {
    /**
     * Get Overview Stats (Clicks, Conversions, Revenue)
     * @param {string|null} apiKey - Advertiser API Key (Optional if advertiser_id provided)
     * @param {object} params - { from, to, advertiser_id, campaign_id, influencer_id }
     */
    getOverview: (apiKey, params) => client.get('/stats/overview', {
        headers: apiKey ? { 'X-API-KEY': apiKey } : {},
        params
    }),

    /**
     * Get Daily Chart Data
     * @param {string|null} apiKey - Advertiser API Key (Optional if advertiser_id provided)
     * @param {object} params - { from, to, advertiser_id, campaign_id, influencer_id }
     */
    getChartData: (apiKey, params) => client.get('/stats/chart', {
        headers: apiKey ? { 'X-API-KEY': apiKey } : {},
        params
    }),

    /**
     * Get Top Influencers
     * @param {string|null} apiKey - Advertiser API Key (Optional if advertiser_id provided)
     * @param {object} params - { from, to, advertiser_id, campaign_id, influencer_id }
     */
    getInfluencers: (apiKey, params) => client.get('/stats/influencers', {
        headers: apiKey ? { 'X-API-KEY': apiKey } : {},
        params
    }),

    /**
     * Get Top Campaigns
     * @param {string|null} apiKey
     * @param {object} params
     */
    getCampaigns: (apiKey, params) => client.get('/stats/campaigns', {
        headers: apiKey ? { 'X-API-KEY': apiKey } : {},
        params
    }),

    /**
     * Construct Export URL
     * @param {string|null} apiKey - Advertiser API Key (Optional if advertiser_id provided)
     * @param {object} params - { from, to, advertiser_id, campaign_id, influencer_id }
     */
    getExportUrl: (apiKey, params = {}) => {
        // Can't set headers on a direct link, so this might be tricky if auth is header-based.
        // Usually export endpoints accept token in query param for this reason, OR we download via blob.
        // For MVP, let's assume we use the blob download method in the component.
        return `/stats/export`;
    },

    /**
     * Get Event Breakdown (Funnel Data)
     * @param {string|null} apiKey
     * @param {object} params
     */
    getBreakdown: (apiKey, params) => client.get('/stats/breakdown', {
        headers: apiKey ? { 'X-API-KEY': apiKey } : {},
        params
    }),

    /**
     * Get Top Coupons
     * @param {string|null} apiKey
     * @param {object} params
     */
    getCoupons: (apiKey, params) => client.get('/stats/coupons', {
        headers: apiKey ? { 'X-API-KEY': apiKey } : {},
        params
    }),

    /**
     * Get Top Tracking Links
     * @param {string|null} apiKey
     * @param {object} params
     */
    getTrackingLinks: (apiKey, params) => client.get('/stats/tracking-links', {
        headers: apiKey ? { 'X-API-KEY': apiKey } : {},
        params
    }),

    /**
     * Download Export via Blob (to support Header Auth)
     * @param {string|null} apiKey - Advertiser API Key (Optional if advertiser_id provided)
     * @param {object} params - { from, to, advertiser_id, campaign_id, influencer_id }
     */
    downloadExport: async (apiKey, params) => {
        const response = await client.get('/stats/export', {
            headers: apiKey ? { 'X-API-KEY': apiKey } : {},
            params,
            responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        link.click();
        link.remove();
    },

    /**
     * Get Journey Stats (Sankey Data)
     * @param {string|null} apiKey
     * @param {object} params
     */
    getJourneyStats: (apiKey, params) => client.get('/stats/journey', {
        headers: apiKey ? { 'X-API-KEY': apiKey } : {},
        params
    })
};
