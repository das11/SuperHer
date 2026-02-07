import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, Megaphone, UserPlus, LogOut, Settings, Ticket, Link, TrendingUp, ChevronLeft, ChevronRight, BookOpen, LayoutGrid } from 'lucide-react';

export default function Sidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isCollapsed, setIsCollapsed] = React.useState(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        return saved === 'true';
    });

    const toggleSidebar = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('sidebarCollapsed', newState);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const links = [
        { to: "/", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
        { to: "/dashboard", label: "Performance", icon: <TrendingUp size={20} /> },
        { to: "/advertisers", label: "Advertisers", icon: <Users size={20} /> },
        { to: "/campaigns", label: "Campaigns", icon: <Megaphone size={20} /> },
        { to: "/influencers", label: "Influencers", icon: <UserPlus size={20} /> },
        { to: "/trackers", label: "Trackers", icon: <LayoutGrid size={20} /> },
        { to: "/integration-docs", label: "Integration", icon: <BookOpen size={20} /> },
        { to: "/settings", label: "Settings", icon: <Settings size={20} /> },
    ];

    return (
        <div
            className={`${isCollapsed ? 'w-20' : 'w-72'} bg-slate-900 text-white min-h-screen flex flex-col shadow-xl transition-all duration-300 relative`}
        >
            {/* Toggle Button */}
            <button
                onClick={toggleSidebar}
                className="absolute -right-3 top-8 bg-slate-800 text-slate-400 hover:text-white p-1 rounded-full shadow-lg border border-slate-700 z-50 transition-colors"
            >
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>

            {/* Brand Header */}
            <div className="h-16 flex items-center px-6 border-b border-slate-800 overflow-hidden whitespace-nowrap">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 min-w-[2rem] bg-gradient-to-tr from-blue-500 to-purple-500 rounded-lg flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-500/20">
                        S
                    </div>
                    <div className={`transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                        <h1 className="font-bold text-lg tracking-tight">SuperHer</h1>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Workspace</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-6 space-y-1">
                {!isCollapsed && (
                    <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 whitespace-nowrap">
                        Main Menu
                    </p>
                )}

                {links.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        title={isCollapsed ? link.label : ""}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 group overflow-hidden whitespace-nowrap ${isActive
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50"
                                : "text-slate-400 hover:text-white hover:bg-slate-800"
                            } ${isCollapsed ? 'justify-center' : ''}`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <span className={`transition-colors duration-200 min-w-[20px] ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`}>
                                    {link.icon}
                                </span>
                                <span className={`transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                                    {link.label}
                                </span>
                                {!isCollapsed && isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* User Footer */}
            <div className="p-4 border-t border-slate-800">
                <div className={`flex items-center gap-3 px-2 py-2 rounded-lg bg-slate-800/50 mb-2 ${isCollapsed ? 'justify-center' : ''}`}>
                    <div className="h-9 w-9 min-w-[2.25rem] rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white shadow-inner">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    {!isCollapsed && (
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium text-slate-200 truncate">{user?.name || 'User'}</p>
                            <p className="text-xs text-slate-500 truncate">{user?.role || 'Guest'}</p>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleLogout}
                    title={isCollapsed ? "Sign Out" : ""}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800/50 transition-colors ${isCollapsed ? 'justify-center' : 'justify-center'}`}
                >
                    <LogOut size={16} />
                    {!isCollapsed && <span>Sign Out</span>}
                </button>
            </div>
        </div>
    );
}
