# 🎵 Hathor Music Platform

A **full-stack** AI-powered music streaming platform with advanced features including on-demand playback, cross-device sync, AI playlist generation, native stem separation, vibe control sliders, and digital listening rooms with real-time synchronization.

> **📦 Full-Stack Application:** This is a complete full-stack solution with a React frontend, Node.js/Express backend, PostgreSQL database, and Redis caching layer.

## ✨ Features

### Core Features
- **🎧 On-Demand Playback** - Stream music instantly with high-quality audio
- **🔄 Cross-Device Sync** - Seamlessly continue playback across all your devices
- **🤖 AI Playlist Generator** - Create playlists from natural language prompts
- **🎚️ Native Stem Separation** - Toggle vocals, drums, bass, and other stems independently
- **🎛️ Vibe Control Sliders** - Adjust playback speed and pitch in real-time
- **🏠 Digital Listening Rooms** - Listen to music together in real-time with friends
- **👤 User Authentication** - Secure JWT-based authentication with user profiles

### Technology Stack

#### Backend
- **Node.js** + **Express** - RESTful API server
- **PostgreSQL** - Relational database for structured data
- **Redis** - Fast caching and session management
- **Socket.io** - Real-time WebSocket communication
- **JWT** - Secure token-based authentication

#### Frontend
- **React 18** - Modern UI framework
- **React Router** - Client-side routing
- **Web Audio API** - Advanced audio processing
- **Socket.io Client** - Real-time features
- **Axios** - HTTP client

## 📁 Project Structure

```
hathor-red/
├── server/                    # Backend application
│   ├── config/               # Configuration files
│   │   ├── database.js       # PostgreSQL connection
│   │   └── redis.js          # Redis connection
│   ├── controllers/          # Request handlers
│   │   ├── authController.js
│   │   ├── songController.js
│   │   ├── playlistController.js
│   │   ├── playbackController.js
│   │   └── roomController.js
│   ├── middleware/           # Express middleware
│   │   ├── auth.js           # JWT authentication
│   │   └── upload.js         # File upload handling
│   ├── routes/               # API routes
│   │   ├── auth.js
│   │   ├── songs.js
│   │   ├── playlists.js
│   │   ├── playback.js
│   │   └── rooms.js
│   ├── socket/               # WebSocket handlers
│   │   └── handlers.js
│   ├── utils/                # Utility functions
│   │   └── auth.js
│   └── index.js              # Server entry point
├── client/                   # Frontend application
│   ├── public/              # Static files
│   │   └── index.html
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── Player.js
│   │   │   ├── SongList.js
│   │   │   ├── AIPlaylistGenerator.js
│   │   │   └── ListeningRoom.js
│   │   ├── pages/           # Page components
│   │   │   ├── Home.js
│   │   │   └── Rooms.js
│   │   ├── contexts/        # React contexts
│   │   │   ├── AuthContext.js
│   │   │   └── PlayerContext.js
│   │   ├── services/        # API services
│   │   │   ├── api.js
│   │   │   ├── auth.js
│   │   │   └── music.js
│   │   ├── App.js          # Main app component
│   │   ├── index.js        # Entry point
│   │   └── *.css           # Styling files
│   └── package.json
├── database/                # Database files
│   ├── schema.sql          # Database schema
│   └── seed.sql            # Sample data
├── uploads/                # Uploaded audio files
├── .env.example           # Environment variables template
├── .gitignore            # Git ignore rules
├── package.json          # Root dependencies
├── API.md               # API documentation
├── DEPLOYMENT.md        # Deployment guide
└── README.md            # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or higher
- PostgreSQL 13.x or higher
- Redis 6.x or higher
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hathor-red
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

3. **Setup PostgreSQL database**
   ```bash
   # Create database
   createdb hathor_music
   
   # Run schema
   psql -d hathor_music -f database/schema.sql
   
   # (Optional) Load sample data
   psql -d hathor_music -f database/seed.sql
   ```

4. **Start Redis**
   ```bash
   redis-server
   ```

5. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

6. **Start the application**
   ```bash
   # Development mode (runs both frontend and backend)
   npm run dev
   
   # Or separately:
   # Terminal 1 - Backend
   npm run server
   
   # Terminal 2 - Frontend
   npm run client
   ```

7. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api
   - Health Check: http://localhost:5000/api/health

## 📖 Documentation

- **[Quick Start Guide](QUICKSTART.md)** - Get started in 10 minutes
- **[API Documentation](API.md)** - Complete REST API and WebSocket reference
- **[Features Overview](FEATURES.md)** - Detailed feature descriptions and technical implementation
- **[Deployment Guide](DEPLOYMENT.md)** - Production deployment instructions
- **[Limitations & Missing Features](LIMITATIONS.md)** - What's NOT included in this MVP
- **[Implementation Summary](IMPLEMENTATION_SUMMARY.md)** - Complete implementation details

## 🎯 Key Features Explained

### AI Playlist Generator
The AI playlist generator uses natural language processing to understand user prompts and create personalized playlists. Simply describe your mood or occasion:
- "Upbeat workout songs with high energy"
- "Chill relaxing music for studying"
- "Party dance tracks for the weekend"

### Stem Separation
Toggle individual audio stems (vocals, drums, bass, other) on/off while listening. This feature uses the Web Audio API for client-side processing.

### Vibe Control Sliders
Adjust playback speed (0.5x - 2x) and pitch shift (-12 to +12 semitones) in real-time without stopping the music.

### Digital Listening Rooms
Create or join listening rooms to enjoy music synchronously with friends. Features include:
- Real-time playback synchronization
- Host controls for play/pause/skip
- Live chat
- Participant list
- Up to 50 concurrent listeners per room

### Cross-Device Sync
Your playback state (current song, position, settings) is automatically synced across all your devices using Redis caching and WebSocket updates.

## 🔐 Authentication

The platform uses JWT (JSON Web Tokens) for secure authentication:
1. Register a new account or login
2. Receive a JWT token
3. Token is automatically included in all API requests
4. Token expires after 7 days (configurable)

## 🎨 User Interface

The UI features a modern, gradient-based design with:
- Responsive layout for desktop and mobile
- Intuitive music player controls
- Real-time visual feedback
- Smooth animations and transitions

## 🛠️ Development

### Available Scripts

```bash
# Install all dependencies (root + client)
npm run install-all

# Start both servers concurrently
npm run dev

# Start backend only
npm run server

# Start frontend only
npm run client

# Build frontend for production
npm run build
```

### Environment Variables

See `.env.example` for all available configuration options.

## 🚢 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive deployment instructions covering:
- Traditional server deployment
- Docker deployment
- Cloud platform deployment (Heroku, AWS, Azure, GCP)
- SSL setup
- Process management
- Monitoring and maintenance

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## ⚠️ What This Platform Does NOT Include

This is an MVP (Minimum Viable Product) focusing on core features. The following features are **NOT included** in the current version:

### Missing Commercial Platform Features
- ❌ **Music Licensing & Rights Management** - No integration with music labels or rights organizations
- ❌ **Payment Processing** - No subscription plans, billing, or monetization
- ❌ **Content Recommendation Engine** - No advanced ML-based personalized recommendations
- ❌ **Mobile Native Apps** - Web-only, no iOS/Android native applications
- ❌ **Offline Playback** - No download or offline listening capabilities
- ❌ **Social Network Features** - No user following, activity feeds, or social sharing
- ❌ **Artist/Label Accounts** - No separate account types for content creators
- ❌ **Music Discovery** - No charts, trending, or discovery algorithms
- ❌ **Advanced Search** - Basic search only, no fuzzy matching or complex queries
- ❌ **Video Content** - Audio only, no music videos or visual content
- ❌ **Podcasts & Audiobooks** - Music streaming only
- ❌ **High-Resolution Audio** - Standard quality streaming only
- ❌ **Lyrics & Metadata** - No synchronized lyrics or detailed metadata
- ❌ **Concert/Event Integration** - No ticketing or event information
- ❌ **Third-Party Integrations** - No Spotify/Apple Music imports or external API connections

### Technical Limitations
- ❌ **Production-Grade Stem Separation** - Uses Web Audio API simulation, not real AI-based stem separation (would require Spleeter/Demucs)
- ❌ **Advanced AI Models** - Simple keyword-based AI playlist generation, not GPT/LLM integration
- ❌ **CDN Integration** - Direct file streaming, no content delivery network
- ❌ **Advanced Analytics** - Basic listening history only, no detailed analytics dashboard
- ❌ **Load Balancing** - Single instance design, not horizontally scaled
- ❌ **Comprehensive Testing** - No unit/integration test suite included
- ❌ **CI/CD Pipeline** - No automated deployment pipeline
- ❌ **Rate Limiting** - No API rate limiting implementation
- ❌ **Advanced Security** - Basic JWT auth only, no OAuth, 2FA, or SSO
- ❌ **Monitoring & APM** - No built-in application performance monitoring
- ❌ **Backup & Recovery** - No automated backup systems
- ❌ **Internationalization** - English only, no multi-language support
- ❌ **Accessibility Compliance** - Basic accessibility, not WCAG 2.1 AA compliant
- ❌ **Email System** - No email verification, notifications, or password reset emails

### What You Get Instead
This MVP provides a **solid foundation** with:
- ✅ Complete authentication system
- ✅ Real-time features via WebSockets
- ✅ Working audio streaming
- ✅ Interactive playlist management
- ✅ Basic AI playlist generation
- ✅ Digital listening rooms
- ✅ Cross-device sync
- ✅ Modern, responsive UI

Perfect for:
- 🎓 Learning full-stack development
- 🛠️ Building a portfolio project
- 🚀 Starting a music platform MVP
- 🧪 Experimenting with audio APIs
- 📚 Understanding real-time WebSocket applications

## 🙏 Acknowledgments

- Built with React, Node.js, PostgreSQL, Redis, and Socket.io
- Uses Web Audio API for advanced audio processing
- Inspired by modern music streaming platforms

## 📧 Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

**Built with ❤️ for music lovers everywhere**
