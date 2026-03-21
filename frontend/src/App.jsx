import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Home from './pages/Home';
import Advertisers from './pages/Advertisers';
import Campaigns from './pages/Campaigns';
import Influencers from './pages/Influencers';
import Trackers from './pages/Trackers';
import Dashboard from './pages/Dashboard';
import IntegrationDocs from './pages/IntegrationDocs';
import Settings from './pages/Settings';
import CampaignSettings from './pages/CampaignSettings';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/account" element={<Home />} />
              <Route path="/advertisers" element={<Advertisers />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/campaigns/:id/settings" element={<CampaignSettings />} />
              <Route path="/influencers" element={<Influencers />} />
              <Route path="/trackers" element={<Trackers />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/integration-docs" element={<IntegrationDocs />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </CurrencyProvider>
    </AuthProvider>
  );
}

export default App;
