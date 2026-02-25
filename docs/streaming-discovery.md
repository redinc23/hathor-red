# Deep Discovery — `redinc23/hathor-red`

Generated: 2026-02-24

---

## 1. Client Playback Layer (`client/src/services/music.js`)

The client exposes the full API surface for every subsystem. The streaming entry point is one of many methods:

```javascript
// music.js:21-23  — URL-only, no token in URL; token travels in header via interceptor
streamSong: (id) => {
  return `${api.defaults.baseURL}/songs/${id}/stream`;
},
```

**Complete method inventory** (all backed by `api.js` axios instance):

| Method | Verb | Path | Notes |
|---|---|---|---|
| `getSongs` | GET | `/songs` | Accepts `genre`, `search`, `limit`, `offset` params |
| `getSongById` | GET | `/songs/:id` | Single song lookup |
| `uploadSong` | POST | `/songs/upload` | Multipart; `Content-Type` override |
| `streamSong` | — | `/songs/:id/stream` | Returns URL string, not a Promise |
| `recordListening` | POST | `/songs/record-listening` | Body: `{songId, duration}` |
| `getPlaylists` / `getPlaylistById` | GET | `/playlists` / `/playlists/:id` | — |
| `createPlaylist` | POST | `/playlists` | Body: `{name, description, isPublic}` |
| `addSongToPlaylist` | POST | `/playlists/add-song` | Body: `{playlistId, songId}` |
| `generateAIPlaylist` | POST | `/playlists/generate-ai` | Body: `{prompt, name}` |
| `deletePlaylist` | DELETE | `/playlists/:id` | — |
| `getPlaybackState` | GET | `/playback/state` | Cross-device Redis-cached state |
| `updatePlaybackState` | POST | `/playback/state` | Full state object |
| `getRooms` / `getRoomById` | GET | `/rooms` / `/rooms/:id` | — |
| `createRoom` | POST | `/rooms` | Body: `{name, isPublic, maxListeners}` |
| `joinRoom` / `leaveRoom` | POST | `/rooms/:id/join\|leave` | — |
| `deleteRoom` | DELETE | `/rooms/:id` | — |

**Key observation:** `streamSong` deviates from every other method — it returns a raw URL string rather than a Promise. This means the `<audio src={...}>` element carries the token separately (via the interceptor on every other XHR), but a plain `src` attribute on an `<audio>` tag bypasses axios entirely. **The browser will issue the stream request without the `Authorization` header** unless the player is constructed as a `fetch`/`MediaSource` pipeline instead of a bare `<audio src>` tag.

---

## 2. Client API Wrapper (`client/src/services/api.js`)

```javascript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});
```

**Request interceptor** — attaches JWT from localStorage:
```javascript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**Response interceptor** — automatic 401 handling:
```javascript
(error) => {
  if (error.response?.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
  return Promise.reject(error);
}
```

**Observations:**
- Token storage: `localStorage` (not `httpOnly` cookie). Accessible to any JS in the same origin — relevant if a XSS vector existed.
- 401 auto-redirect clears the token before navigating, so stale tokens are evicted client-side.
- `baseURL` is the same value used to construct the `streamSong` URL, so environment config controls both.

---

## 3. Server Auth Middleware (`server/middleware/auth.js`)

```javascript
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;       // { userId, username }
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid authentication token' });
  }
};
```

**Token generation** (`server/utils/auth.js`):
```javascript
const generateToken = (userId, username) => {
  return jwt.sign(
    { userId, username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};
```

**Password utilities** (`server/utils/auth.js`):
```javascript
hashPassword    → bcrypt.hash(password, 10)    // saltRounds = 10
comparePassword → bcrypt.compare(password, hash)
```

**Observations:**
- `req.header('Authorization')?.replace('Bearer ', '')` — replaces only the first occurrence, no whitespace stripping. Malformed headers like `Bearer  <token>` (double space) fail verification silently, returning 401.
- Payload on `req.user` is `{ userId, username }`. No role or scope in the token.
- Default expiry `7d` with no refresh token mechanism and no revocation.
- Socket.io uses the same `jwt.verify` pattern reading from `socket.handshake.auth.token`, keeping parity with the HTTP layer.

---

## 4. Route Registration & Validation (`server/routes/songs.js` + `server/middleware/validation.js`)

Full route chain for the songs router:

```
GET  /songs                  → authMiddleware → getSongs
GET  /songs/:id              → authMiddleware → idParamValidation → validate → getSongById
POST /songs/upload           → authMiddleware → upload.single('audio') → songUploadValidation → validate → uploadSong
GET  /songs/:id/stream       → authMiddleware → streamSong           ← NO validation middleware
POST /songs/record-listening → authMiddleware → recordListeningValidation → validate → recordListening
```

**Validation rules in use:**

```javascript
// idParamValidation
param('id').isInt({ min: 1 })

// songUploadValidation
body('title').trim().notEmpty().isLength({ max: 255 })
body('artist').trim().notEmpty().isLength({ max: 255 })
body('album').optional().trim().isLength({ max: 255 })
body('duration').isInt({ min: 1 })
body('genre').optional().trim().isLength({ max: 50 })
body('year').optional().isInt({ min: 1900, max: new Date().getFullYear() })

// recordListeningValidation
body('songId').isInt({ min: 1 })
body('duration').optional().isInt({ min: 0 })

// addSongToPlaylistValidation
body('playlistId').isInt({ min: 1 })
body('songId').isInt({ min: 1 })

// roomValidation
body('name').trim().notEmpty().isLength({ max: 100 })
body('isPublic').optional().isBoolean()
body('maxListeners').optional().isInt({ min: 2, max: 100 })
```

**Observation:** The stream route (`GET /songs/:id/stream`) has `authMiddleware` but **no `idParamValidation → validate`** chain. The raw `id` param goes straight to the DB query (`SELECT file_path FROM songs WHERE id = $1`). For `songs.id SERIAL` (integer), passing a non-numeric `:id` causes Postgres to raise an `invalid input syntax for type integer` error, which is caught by the controller and returned as a 500, not a 404. Adding `idParamValidation` (for example, `param('id').isInt({ min: 1 })` combined with `validate`) would reject invalid IDs up front with a 400 and prevent this DB error/500 path.

---

## 5. StreamSong Controller (`server/controllers/songController.js`)

```javascript
const streamSong = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT file_path FROM songs WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }

    const filePath = path.join(__dirname, '..', '..', result.rows[0].file_path);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Stream song error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

**File path construction:**
- `__dirname` = `server/controllers`
- `path.join(__dirname, '..', '..')` = project root
- `file_path` stored as `/uploads/<uuid>.<ext>`
- Full resolved path: `<project-root>/uploads/<uuid>.<ext>`

**What `res.sendFile` does and does NOT do:**
- Sets `Content-Type` from file extension — correct for `.mp3`, `.wav`, etc.
- Does **not** set `Accept-Ranges: bytes`
- Does **not** handle the `Range` request header
- Does **not** emit `Content-Range` or partial content (HTTP 206) responses
- Responds HTTP 200 and streams the entire file for every request

**Consequence for audio playback:** HTML5 `<audio>` elements require byte-range support to seek. Without `Accept-Ranges: bytes`, browsers disable seeking. Any seek forces a full re-download from byte 0. Mobile Safari will often refuse to play without a 206 Partial Content response.

**Also absent:**
- No ETag / `Last-Modified` cache headers on the stream response
- No authorization check on who uploaded vs. who is streaming — any authenticated user can stream any song by ID

---

## 6. File Upload Pipeline (`server/middleware/upload.js`)

```javascript
const allowedTypes = /mp3|wav|flac|m4a|ogg/;

// Dual-check: extension AND MIME type
const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('audio/');

// Stored as: uploads/<uuid>.<original-ext>
// Size limit: process.env.MAX_FILE_SIZE || 50MB
```

**File path stored in DB:**
```javascript
const filePath = `/uploads/${req.file.filename}`;
```

**Observation:** Uploaded files are reachable via **two paths**:
1. Authenticated `GET /api/songs/:id/stream` — requires JWT
2. Unauthenticated `GET /uploads/<filename>` — Express static middleware, no auth

If an attacker knows the UUID filename, they bypass authentication entirely.

---

## 7. CORS Configuration (`server/config/cors.js`)

```javascript
origin: (origin, callback) => {
  const clientUrl = process.env.CLIENT_URL;
  const allowedOrigins = clientUrl ? clientUrl.split(',').map(o => o.trim()) : [];

  // Dev fallback: always allow localhost:3000
  if (process.env.NODE_ENV !== 'production') {
    if (!allowedOrigins.includes('http://localhost:3000')) {
      allowedOrigins.push('http://localhost:3000');
    }
  }

  // No origin (curl, mobile, server-to-server) → always allowed
  if (!origin) return callback(null, true);

  if (allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    // Production: silently deny (no CORS error header emitted)
    // Dev/test: throw error for clearer debugging
    if (process.env.NODE_ENV === 'production') {
      callback(null, false);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  }
},
credentials: true,
methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
allowedHeaders: ['Content-Type', 'Authorization']
```

**Key details:**
- `CLIENT_URL` is comma-separated — supports multiple origins (CDN + custom domain)
- Requests with **no origin header** are unconditionally allowed (curl, React Native)
- Same `corsOptions` passed to both Express and Socket.io — consistent origin policy for WebSocket upgrades
- In production, rejected origin gets `callback(null, false)` — browser blocks it but no server-side error

---

## 8. Rate Limiting (`server/index.js`)

```javascript
// Global API limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 100,                     // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);      // Applied to ALL /api/* routes

// Stricter auth limiter
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max: 10,                      // 10 attempts per hour
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
```

**Observation:** The stream endpoint falls under the global 100 req/15 min limiter. Heavy listening will exhaust this quickly. Behind Nginx, the rate limiter keys on the proxy IP unless `app.set('trust proxy', 1)` is configured — not confirmed in `index.js`.

---

## 9. Security Headers (`server/index.js` via Helmet)

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      scriptSrc:  ["'self'"],
      imgSrc:     ["'self'", "data:", "https:"],
      mediaSrc:   ["'self'", "blob:"],        // audio/video elements
      connectSrc: ["'self'", "wss:", "ws:"]  // WebSocket connections
    }
  }
}));
```

`mediaSrc: ["'self'", "blob:"]` — correct for audio. `connectSrc` allows `wss:` / `ws:` for Socket.io.

---

## 10. Nginx Layer (`nginx/nginx.conf`)

```nginx
upstream app { server app:5000; }

location / {
    proxy_pass         http://app;
    proxy_http_version 1.1;
    proxy_set_header   Upgrade $http_upgrade;
    proxy_set_header   Connection 'upgrade';
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

location /socket.io {
    proxy_pass         http://app;
    proxy_http_version 1.1;
    proxy_set_header   Upgrade $http_upgrade;
    proxy_set_header   Connection "upgrade";
    proxy_set_header   Host $host;
    proxy_cache_bypass $http_upgrade;
}

location /uploads {
    proxy_pass         http://app/uploads;
    expires            30d;
    add_header         Cache-Control "public, immutable";
}

add_header X-Frame-Options       "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff"   always;
add_header X-XSS-Protection      "1; mode=block" always;
```

**Critical observations:**
- **`Authorization` header is NOT forwarded for `/uploads`** — consistent with files being publicly accessible without auth
- **`Range` header is NOT forwarded in any location block** — browser seek requests reach Express without the Range header, compounding the byte-range problem in §5
- No `proxy_buffering off` for the stream path — Nginx buffers the full file before sending, increasing TTFB for large audio files

---

## 11. Socket.io Real-time Layer (`server/socket/handlers.js`)

**Authentication:** Token in `socket.handshake.auth.token`, verified with `jwt.verify`. Attaches `socket.userId` and `socket.username`.

**Room joining:** Validates room exists in DB, then `socket.join(\`room-${roomId}\`)`. Sends current room state (`currentSongId`, `position`, `isPlaying`) from the DB row to the new joiner.

**Host-only control:** `room-control` event reads `host_id` from DB and compares to `socket.userId` before any state mutation. All four actions (`play`, `pause`, `seek`, `change-song`) use parameterized `UPDATE` queries with `updated_at = CURRENT_TIMESTAMP`.

**Cross-device sync:**
```javascript
// Correct: targets user-specific room, not all clients
socket.to(`user-${socket.userId}`).emit('sync-state', state);
```

**Chat:** `room-chat` events broadcast to the full room with **no persistence, no message sanitization, and no length limit** — raw `message` from client is emitted to all room members as-is.

---

## 12. Database Layer

**Connection pool** (`server/config/database.js`):
- Pool size: `max: 20` connections
- `connectionTimeoutMillis: 2000` — fails fast on DB unreachable
- `idleTimeoutMillis: 30000`
- SSL enabled by default for `DATABASE_URL` with `rejectUnauthorized: false`; disabled only when `DATABASE_SSL=false`
- Pool idle error triggers `process.exit(-1)` — hard crash

**Schema summary** (`database/schema.sql`):

| Table | Primary concern |
|---|---|
| `users` | Auth identity; `password_hash` (bcrypt) |
| `songs` | Metadata + `file_path`; `uploaded_by → users.id ON DELETE SET NULL` |
| `playlists` | Owner + `is_ai_generated` flag + raw `prompt` stored |
| `playlist_songs` | Many-to-many; `UNIQUE(playlist_id, song_id)` prevents duplicates |
| `listening_rooms` | Host + live playback state; `updated_at` required by room-control SQL |
| `room_participants` | Membership; `UNIQUE(room_id, user_id)` |
| `playback_states` | Per-user `UNIQUE` — one row per user; `stems_config JSONB` |
| `listening_history` | Append-only play records; `duration_played INTEGER` |

**`COUNT(*)` integer trap:** `pg` returns `bigint` columns as strings. Always `parseInt(value, 10)` before arithmetic or numeric comparison.

---

## 13. Redis Caching Layer

**Correct resilience pattern** (`playbackController.js`):
```javascript
// Read: fail silently, fall through to DB
try {
  cached = await redisClient.get(cacheKey);
} catch (redisErr) {
  console.error('Redis get error (falling back to DB):', redisErr.message);
}

// Write after DB read: fail silently, still return data
try {
  await redisClient.setEx(cacheKey, 3600, JSON.stringify(state));
} catch (redisErr) {
  console.error('Redis setEx error (cache miss, state still returned):', redisErr.message);
}
```

Cache key: `playback:<userId>`, TTL: 3600 seconds (1 hour).

**Reconnect strategy** (`config/redis.js`):
```javascript
reconnectStrategy: (retries) => Math.min(retries * 50, 500)
```
Caps retry delay at 500 ms.

---

## 14. Health Check Endpoint

```
GET /api/health
```

Returns:
- `status`: `"ok"` | `"degraded"`
- `uptime`: `process.uptime()`
- `checks.database`: `SELECT 1` probe
- `checks.redis`: `redis.ping()` probe

HTTP 200 when healthy, HTTP 503 when degraded.

---

## Summary: Open Discovery Items

| # | Area | Finding |
|---|---|---|
| 1 | Stream route | `GET /songs/:id/stream` missing `idParamValidation` — raw `id` param goes to DB |
| 2 | Byte-range seeking | `res.sendFile` sends no `Accept-Ranges` header; Nginx also strips `Range` header — audio seeking is broken |
| 3 | Auth bypass on uploads | `/uploads/<uuid>` is a public static route — no JWT required if filename is known |
| 4 | Rate limiter trust proxy | `app.set('trust proxy', 1)` not confirmed — limiter may key on Nginx IP in production |
| 5 | Stream token delivery | `streamSong` returns a URL string; bare `<audio src>` bypasses axios interceptor — JWT is not sent |
| 6 | Chat sanitization | `room-chat` message content broadcast without sanitization or length limit |
| 7 | Token expiry | 7-day JWT, no refresh token, no revocation mechanism |
