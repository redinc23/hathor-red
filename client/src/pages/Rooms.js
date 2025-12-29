import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { musicService } from '../services/music';
import './Rooms.css';

const Rooms = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [maxListeners, setMaxListeners] = useState(50);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const data = await musicService.getRooms();
      setRooms(data.rooms);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      await musicService.createRoom(roomName, isPublic, maxListeners);
      setShowCreateForm(false);
      setRoomName('');
      loadRooms();
    } catch (error) {
      console.error('Failed to create room:', error);
      alert('Failed to create room');
    }
  };

  return (
    <div className="rooms-page">
      <div className="rooms-header">
        <h1>🎧 Listening Rooms</h1>
        <p>Join or create a room to listen to music together in real-time</p>
        <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn-create">
          {showCreateForm ? 'Cancel' : '+ Create Room'}
        </button>
      </div>

      {showCreateForm && (
        <div className="create-room-form">
          <h2>Create New Room</h2>
          <form onSubmit={handleCreateRoom}>
            <div className="form-group">
              <label>Room Name</label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                Public Room
              </label>
            </div>

            <div className="form-group">
              <label>Max Listeners</label>
              <input
                type="number"
                value={maxListeners}
                onChange={(e) => setMaxListeners(parseInt(e.target.value))}
                min="1"
                max="100"
              />
            </div>

            <button type="submit" className="btn-submit">Create Room</button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading rooms...</div>
      ) : rooms.length === 0 ? (
        <div className="empty">No rooms available. Create one!</div>
      ) : (
        <div className="rooms-grid">
          {rooms.map((room) => (
            <Link to={`/room/${room.id}`} key={room.id} className="room-card">
              <div className="room-header">
                <h3>{room.name}</h3>
                {room.is_playing && <span className="live-badge">🔴 LIVE</span>}
              </div>
              
              <div className="room-info">
                <p className="host">Host: {room.host_display_name || room.host_username}</p>
                {room.current_song_title && (
                  <p className="now-playing">
                    🎵 {room.current_song_title} - {room.current_song_artist}
                  </p>
                )}
              </div>

              <div className="room-footer">
                <span className="listeners">👥 {room.listener_count || 0} listening</span>
                <span className="join-btn">Join →</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="back-link">
        <Link to="/">← Back to Home</Link>
      </div>
    </div>
  );
};

export default Rooms;
