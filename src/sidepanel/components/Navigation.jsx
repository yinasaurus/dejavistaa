import React from 'react';

export default function Navigation({ activeTab, setActiveTab }) {
  return (
    <nav className="navigation">
      <button
        className={`nav-tab ${activeTab === 'mirror' ? 'active' : ''}`}
        onClick={() => setActiveTab('mirror')}
      >
        Mirror
      </button>
      <button
        className={`nav-tab ${activeTab === 'closet' ? 'active' : ''}`}
        onClick={() => setActiveTab('closet')}
      >
        Memory
      </button>
      <button
        className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
        onClick={() => setActiveTab('settings')}
      >
        Settings
      </button>
    </nav>
  );
}
