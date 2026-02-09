import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, IndianRupee, Check, Loader } from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';

export default function CurrencySettings() {
    const { currency, updateCurrency, loading } = useCurrency();
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleCurrencyChange = async (newCurrency) => {
        if (newCurrency === currency || saving) return;

        setSaving(true);
        setSuccess(false);

        const result = await updateCurrency(newCurrency);

        if (result) {
            setSuccess(true);
            setTimeout(() => setSuccess(false), 2000);
        }

        setSaving(false);
    };

    const options = [
        { value: 'USD', label: 'US Dollar', symbol: '$', icon: DollarSign },
        { value: 'INR', label: 'Indian Rupee', symbol: '₹', icon: IndianRupee }
    ];

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
                Loading...
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">Currency Settings</h2>
                <p className="text-sm text-slate-500 mt-1">
                    Choose the currency for displaying monetary values across the platform.
                </p>
            </div>

            {/* Options */}
            <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {options.map((opt) => {
                        const isSelected = currency === opt.value;
                        const Icon = opt.icon;

                        return (
                            <motion.button
                                key={opt.value}
                                onClick={() => handleCurrencyChange(opt.value)}
                                disabled={saving}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`relative p-5 rounded-xl border-2 transition-all text-left ${isSelected
                                        ? 'border-purple-500 bg-purple-50/50 shadow-md shadow-purple-100'
                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                    } ${saving ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                                {/* Selected Check */}
                                {isSelected && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute top-3 right-3 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center"
                                    >
                                        <Check size={14} className="text-white" />
                                    </motion.div>
                                )}

                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isSelected ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                        <Icon size={24} />
                                    </div>
                                    <div>
                                        <div className={`font-bold ${isSelected ? 'text-purple-700' : 'text-slate-700'}`}>
                                            {opt.label}
                                        </div>
                                        <div className="text-sm text-slate-500">{opt.symbol} {opt.value}</div>
                                    </div>
                                </div>
                            </motion.button>
                        );
                    })}
                </div>

                {/* Status */}
                {(saving || success) && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 flex items-center justify-center gap-2 text-sm"
                    >
                        {saving && (
                            <>
                                <Loader size={16} className="animate-spin text-purple-500" />
                                <span className="text-slate-500">Saving...</span>
                            </>
                        )}
                        {success && (
                            <>
                                <Check size={16} className="text-emerald-500" />
                                <span className="text-emerald-600 font-medium">Currency updated!</span>
                            </>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
