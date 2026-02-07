import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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
import Login from './pages/Login';
import Signup from './pages/Signup';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/advertisers" element={<Advertisers />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/influencers" element={<Influencers />} />
            <Route path="/trackers" element={<Trackers />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/integration-docs" element={<IntegrationDocs />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
