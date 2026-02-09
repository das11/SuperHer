import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Users, Settings as SettingsIcon } from 'lucide-react';

// Components
import ApiKeyManager from '../components/settings/ApiKeyManager';
import CurrencySettings from '../components/settings/CurrencySettings';

export default function Settings() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('keys');
    const [advertiser, setAdvertiser] = useState(null);
    const [keys, setKeys] = useState([]);
    const [loading, setLoading] = useState(true);

    // Initial Load
    const loadData = async () => {
        try {
            // 1. Get Advertiser (which includes keys based on our previous verify)
            const idToFetch = user?.advertiser_id || localStorage.getItem('dashboard_advertiser_id');
            if (idToFetch) {
                const res = await api.advertisers.get(idToFetch);
                setAdvertiser(res.data);
                setKeys(res.data.api_keys || []);
            }
        } catch (err) {
            console.error("Failed to load settings data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [user]);

    const tabs = [
        { id: 'keys', label: 'API Keys', icon: Shield },
        { id: 'general', label: 'General', icon: SettingsIcon },
        { id: 'profile', label: 'Profile', icon: User, disabled: true }, // Placeholder
        { id: 'team', label: 'Team', icon: Users, disabled: true },    // Placeholder
    ];

    if (loading) {
        return <div className="p-8 flex justify-center text-slate-400">Loading settings...</div>;
    }

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
                <p className="text-slate-500 mt-2">Manage your account, security preferences, and team members.</p>
            </div>

            {/* Tabs & Content Layout */}
            <div className="flex flex-col md:flex-row gap-8">

                {/* Sidebar Navigation */}
                <nav className="w-full md:w-64 shrink-0 space-y-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => !tab.disabled && setActiveTab(tab.id)}
                            disabled={tab.disabled}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                } ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <tab.icon size={18} className={activeTab === tab.id ? 'text-blue-500' : 'text-slate-400'} />
                            {tab.label}
                            {tab.disabled && <span className="ml-auto text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Soon</span>}
                        </button>
                    ))}
                </nav>

                {/* Main Content Area */}
                <div className="flex-1 min-w-0">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {activeTab === 'keys' && advertiser && (
                            <ApiKeyManager
                                advertiserId={advertiser.id}
                                keys={keys}
                                onKeysUpdated={loadData} // Reloads full advertiser object to refresh keys list
                            />
                        )}

                        {/* Valid placeholders for future expansion */}
                        {activeTab === 'general' && (
                            <CurrencySettings />
                        )}

                        {activeTab === 'profile' && (
                            <div className="bg-white p-12 rounded-xl border border-dashed border-slate-300 text-center text-slate-400">
                                Profile settings coming soon.
                            </div>
                        )}
                    </motion.div>
                </div>

            </div>
        </div>
    );
}
