import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { Copy, Check, Terminal, Code2, Book, Shield, Zap, Info, ChevronDown } from 'lucide-react';
import { api } from '../api/services';

// --- Sub-components ---

const CodeBlock = ({ language, code, title }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="rounded-xl overflow-hidden border border-slate-700/50 bg-[#1e1e1e] shadow-2xl my-6 group">
            <div className="flex items-center justify-between px-4 py-3 bg-[#252526] border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                        <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50" />
                        <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                    </div>
                    {title && <span className="ml-3 text-xs font-mono text-slate-400">{title}</span>}
                </div>
                <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span className="text-xs font-medium">{copied ? 'Copied' : 'Copy'}</span>
                </button>
            </div>

            <div className="flex overflow-x-auto p-4 bg-[#1e1e1e]">
                {/* Line Numbers */}
                <div className="flex flex-col text-right pr-4 border-r border-slate-700/50 select-none mr-4">
                    {code.split('\n').map((_, i) => (
                        <span key={i} className="font-mono text-sm leading-6 text-slate-600">
                            {i + 1}
                        </span>
                    ))}
                </div>

                {/* Code Content */}
                <pre className="font-mono text-sm leading-6 text-blue-100 flex-1">
                    <code>{code}</code>
                </pre>
            </div>
        </div>
    );
};

const Section = ({ title, icon: Icon, children, id }) => (
    <motion.section
        id={id}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-16 scroll-mt-24"
    >
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 rounded-lg border border-blue-100 text-blue-600">
                <Icon size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        </div>
        {children}
    </motion.section>
);

const ParameterRow = ({ name, type, required, desc }) => (
    <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-8 py-5 border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors px-6">
        <div className="w-48 shrink-0">
            <div className="flex items-center gap-2">
                <code className="text-sm font-bold text-slate-800 bg-slate-100/80 px-2 py-1 rounded border border-slate-200">{name}</code>
                {required ? (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 uppercase tracking-wide">Req</span>
                ) : (
                    <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 uppercase tracking-wide">Opt</span>
                )}
            </div>
            <p className="text-xs font-mono text-slate-400 mt-2 pl-1">{type}</p>
        </div>
        <div className="flex-1 text-sm text-slate-600 leading-relaxed pt-1">
            {desc}
        </div>
    </div>
);

// --- Main Page ---

export default function IntegrationDocs() {
    const [apiKey, setApiKey] = useState('<YOUR_API_KEY>');
    const [activeTab, setActiveTab] = useState('curl');

    // NOTE: We do not fetch the key here because the backend only stores hashes.
    // The user should know their key or generate a new one.

    // Scroll spy or simple jump links could go here

    const baseUrl = window.location.origin.replace('3000', '8000') + '/api/v1'; // Dev hack, usually from ENV
    const endpoint = `${baseUrl}/events/`;

    const codeSamples = {
        curl: `curl -X POST "${endpoint}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-KEY: ${apiKey}" \\
  -d '{
    "action": "purchase",
    "value": 99.00,
    "currency": "USD",
    "coupon_code": "SUMMER20",
    "properties": {
      "order_id": "1001",
      "items": ["sku_123", "sku_456"]
    }
  }'`,
        python: `import requests

url = "${endpoint}"

payload = {
    "action": "purchase",
    "value": 99.00,
    "currency": "USD",
    "coupon_code": "SUMMER20",
    "properties": {
        "order_id": "1001",
        "items": ["sku_123", "sku_456"]
    }
}

headers = {
    "Content-Type": "application/json",
    "X-API-KEY": "${apiKey}"
}

response = requests.post(url, json=payload, headers=headers)

if response.status_code == 201:
    print("Event ingested:", response.json())
else:
    print("Error:", response.text)`,
        javascript: `const ingestEvent = async () => {
  const response = await fetch("${endpoint}", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': '${apiKey}'
    },
    body: JSON.stringify({
      action: 'purchase',
      value: 99.00,
      currency: 'USD',
      coupon_code: 'SUMMER20',
      properties: {
        order_id: '1001',
        items: ['sku_123', 'sku_456']
      }
    })
  });

  const data = await response.json();
  console.log(data);
};

ingestEvent();`
    };

    return (
        <div className="max-w-4xl mx-auto pb-20">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12 border-b border-slate-200 pb-8"
            >
                <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider border border-indigo-100">
                        Developer API
                    </span>
                    <span className="text-slate-400 text-sm">v1.0</span>
                </div>
                <h1 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">Event Ingestion API</h1>
                <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
                    Integrate SuperHer conversion tracking directly into your checkout flow.
                    Our deterministic attribution engine handles the rest.
                </p>

                <div className="flex gap-4 mt-8">
                    <button
                        onClick={() => document.getElementById('quickstart').scrollIntoView({ behavior: 'smooth' })}
                        className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
                    >
                        Get Started
                    </button>
                    <button
                        onClick={() => document.getElementById('reference').scrollIntoView({ behavior: 'smooth' })}
                        className="px-5 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-sm font-medium hover:border-slate-300 hover:bg-slate-50 transition-colors"
                    >
                        API Reference
                    </button>
                </div>
            </motion.div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr,240px] gap-12">

                {/* Main Column */}
                <div>

                    <Section id="auth" title="Authentication" icon={Shield}>
                        <p className="text-slate-600 mb-6 leading-relaxed">
                            All requests must be authenticated using your generic Advertiser API Key.
                            Pass this key in the <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono text-slate-800">X-API-KEY</code> header.
                        </p>

                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mb-6 flex gap-3">
                            <Info className="text-amber-500 shrink-0 mt-0.5" size={20} />
                            <div className="text-sm text-amber-800">
                                <p className="font-bold mb-1">Security Notice</p>
                                Never expose your API key in client-side code (browsers).
                                This endpoint should strictly be called from your backend servers.
                            </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Your API Key Header</p>
                                <code className="font-mono text-sm text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 block">X-API-KEY: {apiKey}</code>
                            </div>
                            <a href="/settings" className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1">
                                Manage Keys &rarr;
                            </a>
                        </div>
                    </Section>

                    <Section id="quickstart" title="Quick Start" icon={Zap}>
                        <p className="text-slate-600 mb-6">
                            Send a <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-sm text-purple-600 font-bold">POST</code> request
                            to the endpoint below whenever a conversion occurs in your system.
                        </p>

                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl opacity-20 group-hover:opacity-30 transition blur" />
                            <div className="relative bg-[#1e1e1e] rounded-xl p-4 flex items-center justify-between border border-slate-700/50">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs font-bold font-mono">POST</span>
                                    <code className="text-blue-200 font-mono text-sm truncate">{endpoint}</code>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="mt-8">
                            <div className="flex gap-2 border-b border-slate-200 mb-0 px-2">
                                {Object.keys(codeSamples).map(lang => (
                                    <button
                                        key={lang}
                                        onClick={() => setActiveTab(lang)}
                                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === lang
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        {lang}
                                    </button>
                                ))}
                            </div>
                            <CodeBlock
                                code={codeSamples[activeTab]}
                                title={`Example Request (${activeTab})`}
                            />
                        </div>
                    </Section>

                    <Section id="reference" title="Payload Reference" icon={Code2}>
                        <p className="text-slate-600 mb-6">
                            The request body must be a JSON object. Ensure <code>Content-Type</code> is set to <code>application/json</code>.
                        </p>

                        <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
                            <ParameterRow
                                name="action"
                                type="string (enum)"
                                required={true}
                                desc={<span>The type of event. Allowed values: <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">purchase</code>, <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">signup</code>, <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">add_to_cart</code>, <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">custom</code>.</span>}
                            />
                            <ParameterRow
                                name="value"
                                type="float"
                                required={false}
                                desc="The monetary value of the conversion (e.g., 99.50). Required for ROI calculation."
                            />
                            <ParameterRow
                                name="currency"
                                type="string"
                                required={false}
                                desc="ISO 4217 Currency Code. Defaults to 'USD'."
                            />
                            <ParameterRow
                                name="coupon_code"
                                type="string"
                                required={false}
                                desc="The coupon code used by the customer. This is the primary attribution signal."
                            />
                            <ParameterRow
                                name="ref_code"
                                type="string"
                                required={false}
                                desc="The unique referral code from the tracking link (search param '?ref=CODE')."
                            />
                            <ParameterRow
                                name="landing_url"
                                type="string"
                                required={false}
                                desc="The full URL where the user landed. Used to extract 'ref_code' if not explicitly provided."
                            />
                            <ParameterRow
                                name="properties"
                                type="object"
                                required={false}
                                desc="Arbitrary JSON key-value pairs for metadata (e.g. SKUs, Customer IDs)."
                            />
                        </div>
                    </Section>

                    <Section id="attribution" title="Attribution Logic" icon={Book}>
                        <div className="bg-slate-900 rounded-xl p-8 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 translate-y-1/2 -translate-x-1/2" />

                            <h3 className="text-lg font-bold mb-4 relative z-10">Waterfall Priority</h3>
                            <p className="text-slate-300 text-sm mb-8 relative z-10 max-w-lg">
                                When multiple signals are present, SuperHer determines attribution using the following strict priority order:
                            </p>

                            <div className="space-y-4 relative z-10">
                                <div className="flex items-center gap-4 bg-white/10 border border-white/10 rounded-lg p-4 backdrop-blur-sm">
                                    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-indigo-500/50">1</div>
                                    <div>
                                        <p className="font-bold text-indigo-200 text-sm">Coupon Code</p>
                                        <p className="text-xs text-slate-400">Exact match on coupon code ownership.</p>
                                    </div>
                                </div>
                                <div className="ml-6 border-l-2 border-dashed border-slate-700 h-6"></div>
                                <div className="flex items-center gap-4 bg-white/5 border border-white/5 rounded-lg p-4 backdrop-blur-sm">
                                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-blue-500/50">2</div>
                                    <div>
                                        <p className="font-bold text-blue-200 text-sm">Ref Code</p>
                                        <p className="text-xs text-slate-400">Explicit <code>ref_code</code> passed in payload.</p>
                                    </div>
                                </div>
                                <div className="ml-6 border-l-2 border-dashed border-slate-700 h-6"></div>
                                <div className="flex items-center gap-4 bg-white/5 border border-white/5 rounded-lg p-4 backdrop-blur-sm">
                                    <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center font-bold text-white text-sm">3</div>
                                    <div>
                                        <p className="font-bold text-slate-300 text-sm">Lazy Extraction</p>
                                        <p className="text-xs text-slate-400">Auto-extracted from <code>landing_url</code> query params.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Section>

                </div>

                {/* Side Navigation (Table of Contents) */}
                <div className="hidden lg:block sticky top-24 h-fit">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Contents</h4>
                    <ul className="space-y-3">
                        {['Auth', 'Quick Start', 'Reference', 'Attribution'].map(item => (
                            <li key={item}>
                                <button
                                    onClick={() => document.getElementById(item.toLowerCase().replace(' ', '')).scrollIntoView({ behavior: 'smooth' })}
                                    className="text-sm font-medium text-slate-600 hover:text-blue-600 hover:translate-x-1 transition-all flex items-center gap-2"
                                >
                                    <ChevronDown size={12} className="-rotate-90 text-slate-300" />
                                    {item}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

            </div>
        </div>
    );
}
