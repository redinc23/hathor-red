const jwt = require('jsonwebtoken');
const db = require('../config/database');

const setupSocketHandlers = (io) => {
  // Socket.io authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.username} (${socket.userId})`);

    // Join personal room for device syncing
    socket.join(`user-${socket.userId}`);

    // Join a listening room
    socket.on('join-room', async (roomId) => {
      try {
        const roomResult = await db.query(
          'SELECT * FROM listening_rooms WHERE id = $1',
          [roomId]
        );

        if (roomResult.rows.length === 0) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        socket.join(`room-${roomId}`);
        socket.currentRoom = roomId;

        // Notify others in the room
        socket.to(`room-${roomId}`).emit('user-joined', {
          userId: socket.userId,
          username: socket.username
        });

        // Send current room state to the new user
        const room = roomResult.rows[0];
        socket.emit('room-state', {
          currentSongId: room.current_song_id,
          position: room.current_position,
          isPlaying: room.is_playing
        });

        console.log(`User ${socket.username} joined room ${roomId}`);
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Leave a room
    socket.on('leave-room', (roomId) => {
      socket.leave(`room-${roomId}`);
      socket.to(`room-${roomId}`).emit('user-left', {
        userId: socket.userId,
        username: socket.username
      });
      socket.currentRoom = null;
      console.log(`User ${socket.username} left room ${roomId}`);
    });

    // Host controls playback
    socket.on('room-control', async (data) => {
      const { roomId, action, songId, position } = data;

      try {
        const roomResult = await db.query(
          'SELECT host_id FROM listening_rooms WHERE id = $1',
          [roomId]
        );

        if (roomResult.rows.length === 0) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Only host can control playback
        if (roomResult.rows[0].host_id !== socket.userId) {
          socket.emit('error', { message: 'Only host can control playback' });
          return;
        }

        let updateQuery = '';
        let params = [];

        switch (action) {
          case 'play':
            updateQuery = 'UPDATE listening_rooms SET is_playing = true, current_position = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
            params = [position || 0, roomId];
            break;
          case 'pause':
            updateQuery = 'UPDATE listening_rooms SET is_playing = false, current_position = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
            params = [position || 0, roomId];
            break;
          case 'seek':
            updateQuery = 'UPDATE listening_rooms SET current_position = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
            params = [position, roomId];
            break;
          case 'change-song':
            updateQuery = 'UPDATE listening_rooms SET current_song_id = $1, current_position = 0, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
            params = [songId, roomId];
            break;
        }

        if (updateQuery) {
          await db.query(updateQuery, params);

          // Broadcast to all users in the room
          io.to(`room-${roomId}`).emit('room-update', {
            action,
            songId,
            position,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('Room control error:', error);
        socket.emit('error', { message: 'Failed to control playback' });
      }
    });

    // Chat in room
    socket.on('room-chat', (data) => {
      const { roomId, message } = data;
      io.to(`room-${roomId}`).emit('chat-message', {
        userId: socket.userId,
        username: socket.username,
        message,
        timestamp: Date.now()
      });
    });

    // Sync playback state across devices
    socket.on('sync-state', async (state) => {
      try {
        await db.query(
          `INSERT INTO playback_states (user_id, current_song_id, position, is_playing, volume, playback_speed, pitch_shift, stems_config)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (user_id) DO UPDATE SET
             current_song_id = $2,
             position = $3,
             is_playing = $4,
             volume = $5,
             playback_speed = $6,
             pitch_shift = $7,
             stems_config = $8,
             updated_at = CURRENT_TIMESTAMP`,
          [
            socket.userId,
            state.currentSongId,
            state.position,
            state.isPlaying,
            state.volume,
            state.playbackSpeed,
            state.pitchShift,
            state.stemsConfig
          ]
        );

        // Broadcast to user's other devices
        socket.to(`user-${socket.userId}`).emit(`sync-${socket.userId}`, state);
      } catch (error) {
        console.error('Sync state error:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.username}`);

      if (socket.currentRoom) {
        socket.to(`room-${socket.currentRoom}`).emit('user-left', {
          userId: socket.userId,
          username: socket.username
        });
      }
    });
  });
};

module.exports = setupSocketHandlers;
