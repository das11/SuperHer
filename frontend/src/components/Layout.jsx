import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Header Bar */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <h2 className="text-sm font-medium text-slate-500">Overview</h2>
                        <span className="text-slate-300">/</span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                            BETA
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="text-sm font-medium text-slate-500 hover:text-slate-900">Support</button>
                        <button className="text-sm font-medium text-slate-500 hover:text-slate-900">Docs</button>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-auto p-8">
                    <div className="max-w-6xl mx-auto animate-fade-in">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
}
