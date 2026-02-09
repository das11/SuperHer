import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../api/services';

const CurrencyContext = createContext(null);

const CURRENCY_CONFIG = {
    USD: { symbol: '$', locale: 'en-US' },
    INR: { symbol: '₹', locale: 'en-IN' }
};

export const CurrencyProvider = ({ children }) => {
    const { user } = useAuth();
    const [currency, setCurrency] = useState('USD');
    const [loading, setLoading] = useState(true);

    // Load currency from user's own advertiser on mount
    useEffect(() => {
        const loadCurrency = async () => {
            // Always use user's own advertiser_id for currency preference
            const advertiserId = user?.advertiser_id;
            if (advertiserId) {
                try {
                    const res = await api.advertisers.get(advertiserId);
                    setCurrency(res.data.currency || 'USD');
                } catch (err) {
                    console.error('Failed to load currency preference', err);
                }
            }
            setLoading(false);
        };

        if (user) {
            loadCurrency();
        } else {
            setLoading(false);
        }
    }, [user]);

    // Update currency preference for user's own advertiser
    const updateCurrency = async (newCurrency) => {
        // Always use user's own advertiser_id (not the dashboard selector)
        const advertiserId = user?.advertiser_id;
        if (advertiserId) {
            try {
                await api.advertisers.update(advertiserId, { currency: newCurrency });
                setCurrency(newCurrency);
                return true;
            } catch (err) {
                console.error('Failed to update currency', err);
                return false;
            }
        }
        return false;
    };

    // Format a number as currency
    const formatCurrency = (value, options = {}) => {
        const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD;
        const num = Number(value) || 0;

        const formatted = num.toLocaleString(config.locale, {
            minimumFractionDigits: options.decimals ?? 2,
            maximumFractionDigits: options.decimals ?? 2
        });

        return `${config.symbol}${formatted}`;
    };

    // Get just the symbol
    const getSymbol = () => {
        return CURRENCY_CONFIG[currency]?.symbol || '$';
    };

    const value = {
        currency,
        loading,
        updateCurrency,
        formatCurrency,
        getSymbol
    };

    return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = () => {
    const context = useContext(CurrencyContext);
    if (!context) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
};
