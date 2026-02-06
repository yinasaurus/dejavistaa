import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import SignIn from './components/SignIn';
import Navigation from './components/Navigation';
import MirrorTab from './components/MirrorTab';
import ClosetTab from './components/ClosetTab';
import SettingsTab from './components/SettingsTab';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('mirror');

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <SignIn />;
  }

  return (
    <div className="app">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className={`tab-content ${activeTab === 'closet' ? 'closet' : ''}`}>
        {activeTab === 'mirror' && <MirrorTab />}
        {activeTab === 'closet' && <ClosetTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

import { ToastProvider } from './contexts/ToastContext';
import ToastContainer from './components/ToastContainer';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
        <ToastContainer />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
