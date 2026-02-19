import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { musicService } from '../services/music';
import { useAuth } from '../contexts/AuthContext';
import './ListeningRoom.css';

const ListeningRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [socket, setSocket] = useState(null);
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    loadRoom();
    
    const token = localStorage.getItem('token');
    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
      auth: { token },
    });

    newSocket.on('connect', () => {
      newSocket.emit('join-room', id);
    });

    newSocket.on('room-state', (state) => {
      setIsPlaying(state.isPlaying);
      setPosition(state.position);
      if (state.currentSongId) {
        loadCurrentSong(state.currentSongId);
      }
    });

    newSocket.on('room-update', (update) => {
      if (update.action === 'play') {
        setIsPlaying(true);
        setPosition(update.position);
      } else if (update.action === 'pause') {
        setIsPlaying(false);
        setPosition(update.position);
      } else if (update.action === 'seek') {
        setPosition(update.position);
      } else if (update.action === 'change-song') {
        loadCurrentSong(update.songId);
      }
    });

    newSocket.on('user-joined', (data) => {
      addMessage(`${data.username} joined the room`, 'system');
      loadRoom();
    });

    newSocket.on('user-left', (data) => {
      addMessage(`${data.username} left the room`, 'system');
      loadRoom();
    });

    newSocket.on('chat-message', (data) => {
      addMessage(data.message, 'chat', data.username);
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      alert(error.message);
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.emit('leave-room', id);
        newSocket.disconnect();
      }
    };
  }, [id]);

  const loadRoom = async () => {
    try {
      const data = await musicService.getRoomById(id);
      setRoom(data.room);
      setParticipants(data.participants);
      if (data.room.current_song_id) {
        loadCurrentSong(data.room.current_song_id);
      }
    } catch (error) {
      console.error('Failed to load room:', error);
      alert('Room not found');
      navigate('/rooms');
    }
  };

  const loadCurrentSong = async (songId) => {
    try {
      const data = await musicService.getSongById(songId);
      setCurrentSong(data.song);
    } catch (error) {
      console.error('Failed to load song:', error);
    }
  };

  const addMessage = (text, type = 'chat', username = null) => {
    setMessages((prev) => [
      ...prev,
      { text, type, username, timestamp: Date.now() },
    ]);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (messageInput.trim() && socket) {
      socket.emit('room-chat', { roomId: id, message: messageInput });
      setMessageInput('');
    }
  };

  const handleControl = (action, data = {}) => {
    if (socket && room && room.host_id === user.id) {
      socket.emit('room-control', { roomId: id, action, ...data });
    }
  };

  const leaveRoom = async () => {
    try {
      await musicService.leaveRoom(id);
      navigate('/rooms');
    } catch (error) {
      console.error('Failed to leave room:', error);
    }
  };

  if (!room) {
    return <div className="loading">Loading room...</div>;
  }

  const isHost = room.host_id === user?.id;

  return (
    <div className="listening-room-container">
      <div className="room-header">
        <div>
          <h1>{room.name}</h1>
          <p>Host: {room.host_display_name || room.host_username}</p>
        </div>
        <button onClick={leaveRoom} className="btn-leave">Leave Room</button>
      </div>

      <div className="room-content">
        <div className="room-main">
          <div className="now-playing">
            <h2>Now Playing</h2>
            {currentSong ? (
              <div className="current-song">
                <h3>{currentSong.title}</h3>
                <p>{currentSong.artist}</p>
                <div className="playback-status">
                  {isPlaying ? '▶️ Playing' : '⏸️ Paused'}
                </div>
              </div>
            ) : (
              <p>No song playing</p>
            )}

            {isHost && (
              <div className="host-controls">
                <button onClick={() => handleControl('play', { position })}>Play</button>
                <button onClick={() => handleControl('pause', { position })}>Pause</button>
              </div>
            )}
          </div>

          <div className="chat-container">
            <h3>Chat</h3>
            <div className="messages">
              {messages.map((msg, index) => (
                <div key={index} className={`message ${msg.type}`}>
                  {msg.type === 'chat' && <strong>{msg.username}: </strong>}
                  {msg.text}
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} className="message-form">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type a message..."
              />
              <button type="submit">Send</button>
            </form>
          </div>
        </div>

        <div className="room-sidebar">
          <h3>Participants ({participants.length})</h3>
          <div className="participants-list">
            {participants.map((participant) => (
              <div key={participant.id} className="participant">
                <div className="avatar">
                  {participant.avatar_url ? (
                    <img src={participant.avatar_url} alt={participant.username} />
                  ) : (
                    participant.username[0].toUpperCase()
                  )}
                </div>
                <span>{participant.display_name || participant.username}</span>
                {participant.id === room.host_id && <span className="host-badge">Host</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListeningRoom;
