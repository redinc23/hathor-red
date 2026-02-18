import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import Player from '../components/Player';
import SongList from '../components/SongList';
import AIPlaylistGenerator from '../components/AIPlaylistGenerator';
import AIRecommendations from '../components/AIRecommendations';
import AIChat from '../components/AIChat';
import './Home.css';

const Home = () => {
  const { user, logout } = useAuth();
  const { currentSong } = usePlayer();
  const [showAIChat, setShowAIChat] = useState(false);
  const [activeView, setActiveView] = useState('songs'); // 'songs' or 'recommendations'

  return (
    <div className="home-container">
      <header className="header">
        <div className="header-content">
          <h1 className="logo">Hathor Music</h1>
          <nav className="nav">
            <Link to="/">Home</Link>
            <Link to="/playlists">Playlists</Link>
            <Link to="/rooms">Listening Rooms</Link>
            <Link to="/podcast">Podcasts</Link>
            <div className="user-menu">
              <span>Welcome, {user?.display_name || user?.username}!</span>
              <button onClick={logout} className="btn-logout">Logout</button>
            </div>
          </nav>
        </div>
      </header>

      <main className="main-content">
        <Player />

        <div className="view-toggle">
          <button
            className={activeView === 'songs' ? 'active' : ''}
            onClick={() => setActiveView('songs')}
          >
            Browse Songs
          </button>
          <button
            className={activeView === 'recommendations' ? 'active' : ''}
            onClick={() => setActiveView('recommendations')}
          >
            AI Recommendations
          </button>
        </div>

        <div className="content-grid">
          <div className="content-main">
            {activeView === 'songs' ? (
              <SongList />
            ) : (
              <AIRecommendations currentSongId={currentSong?.id} />
            )}
          </div>
          <div className="content-sidebar">
            <AIPlaylistGenerator />
          </div>
        </div>
      </main>

      {/* Floating AI Chat Button */}
      <button
        className="ai-chat-fab"
        onClick={() => setShowAIChat(true)}
        title="AI Music Assistant"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
        </svg>
      </button>

      {/* AI Chat Modal */}
      <AIChat isOpen={showAIChat} onClose={() => setShowAIChat(false)} />
    </div>
  );
};

export default Home;
