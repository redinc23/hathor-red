import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Player from '../components/Player';
import SongList from '../components/SongList';
import AIPlaylistGenerator from '../components/AIPlaylistGenerator';
import './Home.css';

const Home = () => {
  const { user, logout } = useAuth();

  return (
    <div className="home-container">
      <header className="header">
        <div className="header-content">
          <h1 className="logo">🎵 Hathor Music</h1>
          <nav className="nav">
            <Link to="/">Home</Link>
            <Link to="/playlists">Playlists</Link>
            <Link to="/rooms">Listening Rooms</Link>
            <div className="user-menu">
              <span>Welcome, {user?.display_name || user?.username}!</span>
              <button onClick={logout} className="btn-logout">Logout</button>
            </div>
          </nav>
        </div>
      </header>

      <main className="main-content">
        <Player />
        
        <div className="content-grid">
          <div className="content-main">
            <SongList />
          </div>
          <div className="content-sidebar">
            <AIPlaylistGenerator />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
