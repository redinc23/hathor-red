import React, { useState, useEffect } from 'react';
import { musicService } from '../services/music';
import { usePlayer } from '../contexts/PlayerContext';
import './SongList.css';

const SongList = () => {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');

  const { playSong, currentSong } = usePlayer();

  useEffect(() => {
    loadSongs();
  }, [search, selectedGenre]);

  const loadSongs = async () => {
    try {
      setLoading(true);
      const data = await musicService.getSongs({ search, genre: selectedGenre });
      setSongs(data.songs);
    } catch (error) {
      console.error('Failed to load songs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = (song) => {
    playSong(song);
  };

  return (
    <div className="song-list-container">
      <div className="song-list-header">
        <h2>Music Library</h2>
        
        <div className="filters">
          <input
            type="text"
            placeholder="Search songs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />

          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="genre-select"
          >
            <option value="">All Genres</option>
            <option value="Rock">Rock</option>
            <option value="Hip Hop">Hip Hop</option>
            <option value="Electronic">Electronic</option>
            <option value="Jazz">Jazz</option>
            <option value="Classical">Classical</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading songs...</div>
      ) : songs.length === 0 ? (
        <div className="empty">No songs found</div>
      ) : (
        <div className="song-grid">
          {songs.map((song) => (
            <div
              key={song.id}
              className={`song-card ${currentSong?.id === song.id ? 'active' : ''}`}
              onClick={() => handlePlay(song)}
            >
              {song.cover_url ? (
                <img src={song.cover_url} alt={song.title} className="song-cover" />
              ) : (
                <div className="song-cover-placeholder">🎵</div>
              )}
              
              <div className="song-info">
                <h3>{song.title}</h3>
                <p className="artist">{song.artist}</p>
                {song.album && <p className="album">{song.album}</p>}
                <div className="song-meta">
                  {song.genre && <span className="genre-tag">{song.genre}</span>}
                  <span className="duration">{Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SongList;
