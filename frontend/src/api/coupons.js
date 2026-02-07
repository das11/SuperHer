import client from './client';

export const couponsApi = {
    list: (params) => client.get('/coupons/', { params }),

    // Manual creation
    createManual: (data) => client.post('/coupons/', data),

    // Auto generation
    generate: (data) => client.post('/coupons/generate', data),

    get: (id) => client.get(`/coupons/${id}`),

    update: (id, data) => client.put(`/coupons/${id}`, data),

    notify: (data) => client.post('/coupons/notify', data),
};
