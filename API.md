# Hathor Music Platform - API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### Register User
**POST** `/auth/register`

**Body:**
```json
{
  "username": "string (required)",
  "email": "string (required)",
  "password": "string (required)",
  "displayName": "string (optional)"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "token": "jwt_token",
  "user": {
    "id": 1,
    "username": "user123",
    "email": "user@example.com",
    "displayName": "User Name"
  }
}
```

### Login
**POST** `/auth/login`

**Body:**
```json
{
  "username": "string (required)",
  "password": "string (required)"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "jwt_token",
  "user": { /* user object */ }
}
```

### Get Profile
**GET** `/auth/profile` (Protected)

**Response:**
```json
{
  "user": {
    "id": 1,
    "username": "user123",
    "email": "user@example.com",
    "display_name": "User Name",
    "avatar_url": "https://...",
    "created_at": "2023-01-01T00:00:00.000Z"
  }
}
```

### Update Profile
**PUT** `/auth/profile` (Protected)

**Body:**
```json
{
  "displayName": "string (optional)",
  "avatarUrl": "string (optional)"
}
```

---

## Song Endpoints

### Get Songs
**GET** `/songs` (Protected)

**Query Parameters:**
- `search` - Search by title, artist, or album
- `genre` - Filter by genre
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "songs": [
    {
      "id": 1,
      "title": "Song Title",
      "artist": "Artist Name",
      "album": "Album Name",
      "duration": 180,
      "file_path": "/uploads/song.mp3",
      "cover_url": "https://...",
      "genre": "Rock",
      "year": 2023,
      "uploaded_by": 1,
      "created_at": "2023-01-01T00:00:00.000Z"
    }
  ]
}
```

### Get Song by ID
**GET** `/songs/:id` (Protected)

### Upload Song
**POST** `/songs/upload` (Protected)

**Content-Type:** `multipart/form-data`

**Form Data:**
- `audio` - Audio file (required)
- `title` - Song title (required)
- `artist` - Artist name (required)
- `album` - Album name (optional)
- `duration` - Duration in seconds (required)
- `genre` - Genre (optional)
- `year` - Release year (optional)

### Stream Song
**GET** `/songs/:id/stream` (Protected)

Returns the audio file for streaming.

### Record Listening
**POST** `/songs/record-listening` (Protected)

**Body:**
```json
{
  "songId": 1,
  "duration": 180
}
```

---

## Playlist Endpoints

### Get Playlists
**GET** `/playlists` (Protected)

Returns user's playlists and public playlists.

### Get Playlist by ID
**GET** `/playlists/:id` (Protected)

**Response:**
```json
{
  "playlist": {
    "id": 1,
    "user_id": 1,
    "name": "My Playlist",
    "description": "Description",
    "is_ai_generated": false,
    "is_public": true,
    "created_at": "2023-01-01T00:00:00.000Z"
  },
  "songs": [/* array of songs */]
}
```

### Create Playlist
**POST** `/playlists` (Protected)

**Body:**
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "isPublic": "boolean (default: false)"
}
```

### Add Song to Playlist
**POST** `/playlists/add-song` (Protected)

**Body:**
```json
{
  "playlistId": 1,
  "songId": 1
}
```

### Generate AI Playlist
**POST** `/playlists/generate-ai` (Protected)

**Body:**
```json
{
  "prompt": "string (required) - Description of desired playlist",
  "name": "string (optional) - Custom playlist name"
}
```

**Response:**
```json
{
  "message": "AI playlist generated successfully",
  "playlist": {/* playlist object */},
  "songs": [/* array of selected songs */]
}
```

### Delete Playlist
**DELETE** `/playlists/:id` (Protected)

---

## Playback State Endpoints

### Get Playback State
**GET** `/playback/state` (Protected)

Returns current playback state for cross-device sync.

**Response:**
```json
{
  "state": {
    "user_id": 1,
    "current_song_id": 1,
    "position": 45,
    "is_playing": true,
    "volume": 0.8,
    "playback_speed": 1.0,
    "pitch_shift": 0,
    "stems_config": {
      "vocals": true,
      "drums": true,
      "bass": true,
      "other": true
    },
    "updated_at": "2023-01-01T00:00:00.000Z"
  }
}
```

### Update Playback State
**POST** `/playback/state` (Protected)

**Body:**
```json
{
  "currentSongId": 1,
  "position": 45,
  "isPlaying": true,
  "volume": 0.8,
  "playbackSpeed": 1.0,
  "pitchShift": 0,
  "stemsConfig": {
    "vocals": true,
    "drums": true,
    "bass": true,
    "other": true
  }
}
```

---

## Listening Room Endpoints

### Get Rooms
**GET** `/rooms` (Protected)

Returns all public listening rooms.

### Get Room by ID
**GET** `/rooms/:id` (Protected)

**Response:**
```json
{
  "room": {
    "id": 1,
    "name": "Room Name",
    "host_id": 1,
    "current_song_id": 1,
    "current_position": 45,
    "is_playing": true,
    "is_public": true,
    "max_listeners": 50,
    "created_at": "2023-01-01T00:00:00.000Z"
  },
  "participants": [
    {
      "id": 1,
      "username": "user123",
      "display_name": "User Name",
      "joined_at": "2023-01-01T00:00:00.000Z"
    }
  ]
}
```

### Create Room
**POST** `/rooms` (Protected)

**Body:**
```json
{
  "name": "string (required)",
  "isPublic": "boolean (default: true)",
  "maxListeners": "number (default: 50)"
}
```

### Join Room
**POST** `/rooms/:id/join` (Protected)

### Leave Room
**POST** `/rooms/:id/leave` (Protected)

### Delete Room
**DELETE** `/rooms/:id` (Protected)

Only the room host can delete a room.

---

## WebSocket Events (Socket.io)

### Connection
Connect with authentication token:
```javascript
const socket = io('http://localhost:5000', {
  auth: { token: 'jwt_token' }
});
```

### Events to Emit

#### join-room
Join a listening room
```javascript
socket.emit('join-room', roomId);
```

#### leave-room
Leave a listening room
```javascript
socket.emit('leave-room', roomId);
```

#### room-control (Host only)
Control playback in a room
```javascript
socket.emit('room-control', {
  roomId: 1,
  action: 'play' | 'pause' | 'seek' | 'change-song',
  songId: 1,  // for change-song action
  position: 45  // for play, pause, seek actions
});
```

#### room-chat
Send a chat message
```javascript
socket.emit('room-chat', {
  roomId: 1,
  message: 'Hello!'
});
```

#### sync-state
Sync playback state across devices
```javascript
socket.emit('sync-state', {
  currentSongId: 1,
  position: 45,
  isPlaying: true,
  volume: 0.8,
  playbackSpeed: 1.0,
  pitchShift: 0,
  stemsConfig: { /* ... */ }
});
```

### Events to Listen

#### room-state
Receive initial room state
```javascript
socket.on('room-state', (state) => {
  console.log(state);
});
```

#### room-update
Receive playback updates
```javascript
socket.on('room-update', (update) => {
  console.log(update);
});
```

#### user-joined
User joined the room
```javascript
socket.on('user-joined', (data) => {
  console.log(data.username, 'joined');
});
```

#### user-left
User left the room
```javascript
socket.on('user-left', (data) => {
  console.log(data.username, 'left');
});
```

#### chat-message
Receive chat messages
```javascript
socket.on('chat-message', (data) => {
  console.log(data.username, ':', data.message);
});
```

#### sync-{userId}
Receive sync updates for your other devices
```javascript
socket.on(`sync-${userId}`, (state) => {
  console.log('State synced from another device');
});
```

#### error
Receive error messages
```javascript
socket.on('error', (error) => {
  console.error(error.message);
});
```

---

## Error Responses

All endpoints return errors in this format:
```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `400` - Bad Request (missing or invalid parameters)
- `401` - Unauthorized (invalid or missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate entry)
- `500` - Internal Server Error
