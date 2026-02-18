# 🎵 Hathor Music Platform

An AI-powered music streaming platform with advanced features including on-demand playback, cross-device sync, AI playlist generation, native stem separation, vibe control sliders, and digital listening rooms with real-time synchronization.

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
├── API.md                   # API documentation
├── ARCHITECTURE.md          # Full-stack architecture & roadmap
├── DEPLOYMENT.md            # Deployment guide
├── DEPLOYMENT_CHECKLIST.md  # Step-by-step deployment checklist
├── PRODUCTION_READY.md      # Production readiness guide
└── README.md                # This file
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

- **[Manual (How It Works Now)](docs/MANUAL.md)** - Practical guide for anyone new to the codebase
- **[Standards Living Document](docs/STANDARDS_LIVING_DOCUMENT.md)** - Rock-hard repeatable standards, AI prompts, juncture controls
- **[Deploy (Railway/Render)](DEPLOY.md)** - Get live in 15 min
- **[API Documentation](API.md)** - Complete REST API and WebSocket reference
- **[Architecture & Roadmap](ARCHITECTURE.md)** - Full-stack architecture and deployment roadmap
- **[Deployment Guide](DEPLOYMENT.md)** - Production deployment instructions
- **[Deployment Checklist](DEPLOYMENT_CHECKLIST.md)** - Step-by-step deployment checklist
- **[Production Readiness](PRODUCTION_READY.md)** - Gaps and fixes for production deployment
- **[Quick Start](QUICKSTART.md)** - Get started in minutes
- **[Features](FEATURES.md)** - Detailed feature documentation

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

## 🔀 Pull Request Operations

To approve or tag an existing pull request without the GitHub CLI, use:

```bash
export GITHUB_TOKEN=<token-with-repo-scope>
scripts/manage-prs.sh --repo owner/repo --pr 123 --approve
scripts/manage-prs.sh --repo owner/repo --pr 123 --tag needs-review
```

You can combine both actions in one command by passing `--approve` and `--tag` together.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with React, Node.js, PostgreSQL, Redis, and Socket.io
- Uses Web Audio API for advanced audio processing
- Inspired by modern music streaming platforms

## 📧 Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

**Built with ❤️ for music lovers everywhere**
