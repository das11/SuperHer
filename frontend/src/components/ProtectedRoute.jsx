import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';

const ProtectedRoute = ({ allowedRoles = [] }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-[#0f0f13] text-white">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Check Active Status
    if (!user.is_active) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0f0f13] text-white p-6 text-center">
                <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mb-6">
                    <ShieldAlert className="h-8 w-8 text-yellow-500" />
                </div>
                <h1 className="text-3xl font-bold mb-4">Account Pending Approval</h1>
                <p className="text-gray-400 max-w-md mb-8">
                    Your account has been created but requires administrator approval before you can access the dashboard.
                    Please check your email for updates.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                    Check Status
                </button>
            </div>
        );
    }

    return <Outlet />;
};

export default ProtectedRoute;
