import client from './client';

export const trackingApi = {
    list: (params) => client.get('/tracking-links/', { params }),

    create: (data) => client.post('/tracking-links/', data),

    notify: (data) => client.post('/tracking-links/notify', data),

    // Helper to extract clean data or error
    // (optional, but good practice if structure gets complex)
};
