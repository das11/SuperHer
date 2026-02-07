import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertCircle } from 'lucide-react';

/* 
  results: { 
    message: string, 
    emails_sent: number, 
    emails_failed: number, 
    influencers_targeted: number 
  }
*/
const EmailSuccessModal = ({ isOpen, onClose, results }) => {
    if (!results) return null;

    const isPartialFailure = results.emails_failed > 0;
    const isTotalFailure = results.emails_sent === 0 && results.emails_failed > 0;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 transition-all"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none">
                        <motion.div
                            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden pointer-events-auto border border-slate-100"
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            transition={{ type: "spring", duration: 0.4 }}
                        >
                            <div className="p-6 text-center">
                                {/* Icon */}
                                <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isTotalFailure ? 'bg-red-100 text-red-600' :
                                        isPartialFailure ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                                    }`}>
                                    {isTotalFailure ? <AlertCircle size={32} /> :
                                        isPartialFailure ? <AlertCircle size={32} /> : <Check size={32} />}
                                </div>

                                <h2 className="text-xl font-bold text-slate-800 mb-2">
                                    {isTotalFailure ? 'Failed to Send' :
                                        isPartialFailure ? 'Sending Completed with Errors' : 'Emails Sent Successfully!'}
                                </h2>

                                <p className="text-slate-500 text-sm mb-6">
                                    {results.message}
                                </p>

                                {/* Stats Card */}
                                <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-100 grid grid-cols-2 gap-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-slate-700">{results.emails_sent}</div>
                                        <div className="text-xs uppercase tracking-wide font-semibold text-slate-400">Sent</div>
                                    </div>
                                    <div className="text-center">
                                        <div className={`text-2xl font-bold ${results.emails_failed > 0 ? 'text-red-500' : 'text-slate-700'}`}>
                                            {results.emails_failed}
                                        </div>
                                        <div className="text-xs uppercase tracking-wide font-semibold text-slate-400">Failed</div>
                                    </div>
                                </div>

                                {/* Action */}
                                <button
                                    onClick={onClose}
                                    className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors"
                                >
                                    {isTotalFailure ? 'Close' : 'Great, thanks!'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default EmailSuccessModal;
