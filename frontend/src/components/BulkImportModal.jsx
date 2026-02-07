import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileText, Check, AlertCircle, Download } from 'lucide-react';
import client from '../api/client';

const BulkImportModal = ({ isOpen, onClose, onSuccess, campaigns = [] }) => {
    const [step, setStep] = useState('upload'); // upload, preview, processing, result
    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState([]);
    const [errors, setErrors] = useState([]);
    const [importResults, setImportResults] = useState(null);
    const [selectedCampaignId, setSelectedCampaignId] = useState('');
    const fileInputRef = useRef(null);

    // Reset state on close
    const handleClose = () => {
        setStep('upload');
        setFile(null);
        setParsedData([]);
        setErrors([]);
        setImportResults(null);
        setSelectedCampaignId('');
        onClose();
    };

    const handleDownloadTemplate = () => {
        const headers = ['name', 'email', 'social_handle'];
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "influencers_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            parseCSV(selectedFile);
        }
    };

    const parseCSV = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const rows = text.split('\n');
            const data = [];
            const validationErrors = [];

            // Assume first row is header. Basic parsing.
            // Robust parsing would use PapaParse, but keep dependencies low.

            rows.forEach((row, index) => {
                if (index === 0) return; // Skip header
                const cleanRow = row.trim();
                if (!cleanRow) return;

                const cols = cleanRow.split(',').map(c => c.trim());
                // Expecting: name, email, handle
                if (cols.length < 2) return; // Skip invalid

                const item = {
                    name: cols[0] || '',
                    email: cols[1] || '',
                    social_handle: cols[2] || '',
                    valid: true
                };

                // Validate Email
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(item.email)) {
                    item.valid = false;
                    item.error = "Invalid Email";
                }

                // Check duplicates in current batch
                if (data.find(d => d.email === item.email)) {
                    item.valid = false;
                    item.error = "Duplicate in File";
                }

                data.push(item);
            });

            setParsedData(data);
            setStep('preview');
        };
        reader.readAsText(file);
    };

    const handleCellEdit = (index, field, value) => {
        const newData = [...parsedData];
        newData[index][field] = value;
        // Re-validate
        if (field === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                newData[index].valid = false;
                newData[index].error = "Invalid Email";
            } else {
                newData[index].valid = true;
                newData[index].error = null;
            }
        }
        setParsedData(newData);
    };

    const handleImport = async () => {
        setStep('processing');
        const validItems = parsedData.filter(i => i.valid);

        // Prepare payload
        const payload = validItems.map(i => ({
            name: i.name,
            email: i.email,
            social_handle: i.social_handle,
            campaign_id: selectedCampaignId ? parseInt(selectedCampaignId) : null
        }));

        try {
            const response = await client.post('/influencers/bulk', payload);
            setImportResults(response.data);
            setStep('result');
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error("Bulk Import Failed", err);
            setErrors(["API Request Failed: " + (err.response?.data?.detail || err.message)]);
            setStep('result'); // Show error state
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[#121212] border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/5">
                        <h2 className="text-xl font-semibold text-white">Bulk Import Influencers</h2>
                        <button onClick={handleClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {step === 'upload' && (
                            <div className="flex flex-col items-center justify-center space-y-8 py-12">
                                <div
                                    className="w-full max-w-lg border-2 border-dashed border-white/10 rounded-xl p-12 flex flex-col items-center justify-center text-center hover:border-[#CCFF00]/50 transition-colors cursor-pointer group"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 group-hover:bg-[#CCFF00]/10 transition-colors">
                                        <Upload className="text-gray-400 group-hover:text-[#CCFF00]" size={32} />
                                    </div>
                                    <h3 className="text-lg font-medium text-white mb-2">Click to upload CSV</h3>
                                    <p className="text-sm text-gray-400">or drag and drop file here</p>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        accept=".csv"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </div>

                                <button
                                    onClick={handleDownloadTemplate}
                                    className="flex items-center space-x-2 text-[#CCFF00] hover:text-[#CCFF00]/80 transition-colors text-sm"
                                >
                                    <Download size={16} />
                                    <span>Download Template CSV</span>
                                </button>
                            </div>
                        )}

                        {step === 'preview' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-gray-400 text-sm">Found {parsedData.length} records. {parsedData.filter(i => !i.valid).length} invalid.</p>

                                    {/* Campaign Selection - Optional */}
                                    <div className="flex items-center gap-2">
                                        <select
                                            className="bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#CCFF00]/50"
                                            value={selectedCampaignId}
                                            onChange={(e) => setSelectedCampaignId(e.target.value)}
                                        >
                                            <option value="">No Campaign (Add to Roster only)</option>
                                            {campaigns.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    Link to: {c.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="border border-white/10 rounded-lg overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-white/5 text-gray-400">
                                            <tr>
                                                <th className="p-3 font-medium">Name</th>
                                                <th className="p-3 font-medium">Email</th>
                                                <th className="p-3 font-medium">Handle</th>
                                                <th className="p-3 font-medium">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {parsedData.map((row, idx) => (
                                                <tr key={idx} className={!row.valid ? "bg-red-500/10" : ""}>
                                                    <td className="p-3 text-white">
                                                        <input
                                                            value={row.name}
                                                            onChange={(e) => handleCellEdit(idx, 'name', e.target.value)}
                                                            className="bg-transparent border-none focus:outline-none w-full"
                                                        />
                                                    </td>
                                                    <td className="p-3 text-white">
                                                        <input
                                                            value={row.email}
                                                            onChange={(e) => handleCellEdit(idx, 'email', e.target.value)}
                                                            className={`bg-transparent border-none focus:outline-none w-full ${!row.valid ? 'text-red-400' : ''}`}
                                                        />
                                                    </td>
                                                    <td className="p-3 text-white">
                                                        <input
                                                            value={row.social_handle}
                                                            onChange={(e) => handleCellEdit(idx, 'social_handle', e.target.value)}
                                                            className="bg-transparent border-none focus:outline-none w-full"
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        {row.valid ? (
                                                            <Check size={16} className="text-[#CCFF00]" />
                                                        ) : (
                                                            <div className="flex items-center text-red-400 space-x-1">
                                                                <AlertCircle size={16} />
                                                                <span className="text-xs">{row.error}</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {(step === 'processing') && (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                <div className="w-8 h-8 border-2 border-[#CCFF00] border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-gray-400">Importing influencers...</p>
                            </div>
                        )}

                        {step === 'result' && (
                            <div className="flex flex-col items-center justify-center py-12 space-y-6">
                                {errors.length > 0 && !importResults ? (
                                    <div className="text-center space-y-2">
                                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
                                            <X size={32} />
                                        </div>
                                        <h3 className="text-xl font-medium text-white">Import Failed</h3>
                                        <div className="text-red-400 text-sm max-w-md bg-red-500/5 p-4 rounded-lg">
                                            {errors.map((e, i) => <p key={i}>{e}</p>)}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center space-y-4 w-full">
                                        <div className="w-16 h-16 bg-[#CCFF00]/10 rounded-full flex items-center justify-center mx-auto text-[#CCFF00]">
                                            <Check size={32} />
                                        </div>
                                        <h3 className="text-xl font-medium text-white">Import Complete</h3>
                                        <div className="grid grid-cols-3 gap-4 w-full max-w-lg mx-auto">
                                            <div className="bg-white/5 p-4 rounded-lg">
                                                <p className="text-2xl font-bold text-white">{importResults.total_received}</p>
                                                <p className="text-xs text-gray-500 uppercase tracking-wider">Total</p>
                                            </div>
                                            <div className="bg-white/5 p-4 rounded-lg">
                                                <p className="text-2xl font-bold text-[#CCFF00]">{importResults.created}</p>
                                                <p className="text-xs text-gray-500 uppercase tracking-wider">Created</p>
                                            </div>
                                            <div className="bg-white/5 p-4 rounded-lg">
                                                <p className="text-2xl font-bold text-red-400">{importResults.errors.length}</p>
                                                <p className="text-xs text-gray-500 uppercase tracking-wider">Errors</p>
                                            </div>
                                        </div>

                                        {importResults.errors.length > 0 && (
                                            <div className="text-left w-full max-w-lg mx-auto bg-white/5 rounded-lg p-4 mt-4 max-h-40 overflow-y-auto">
                                                <p className="text-xs font-medium text-gray-400 mb-2">Skipped Records:</p>
                                                {importResults.errors.map((err, i) => (
                                                    <div key={i} className="text-xs text-red-400 flex justify-between py-1 border-b border-white/5 last:border-0">
                                                        <span>{err.email}</span>
                                                        <span>{err.error}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-white/5 flex justify-end space-x-4">
                        {step === 'preview' && (
                            <>
                                <button
                                    onClick={() => setStep('upload')}
                                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleImport}
                                    disabled={parsedData.filter(i => i.valid).length === 0}
                                    className="px-6 py-2 bg-[#CCFF00] text-black font-medium rounded-lg hover:bg-[#bbe600] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Import {parsedData.filter(i => i.valid).length} Influencers
                                </button>
                            </>
                        )}
                        {step === 'result' && (
                            <button
                                onClick={handleClose}
                                className="px-6 py-2 bg-white/10 text-white font-medium rounded-lg hover:bg-white/20 transition-colors"
                            >
                                Close
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default BulkImportModal;
