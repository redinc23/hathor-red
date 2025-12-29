# 🎵 Hathor Music Platform

An AI-powered music streaming platform with advanced features including on-demand playback, cross-device sync, AI playlist generation, native stem separation, vibe control sliders, and digital listening rooms with real-time synchronization.

---

## 🚀 Getting Started

**New to the project?** Follow these steps to get up and running:

1. **📖 Read the [DEVELOPMENT.md](DEVELOPMENT.md)** - Complete setup guide with prerequisites, installation, and troubleshooting
2. **⚡ Quick Start** - See the [Quick Start](#-quick-start) section below for a fast overview
3. **❓ Need Help?** - Check [Troubleshooting](DEVELOPMENT.md#troubleshooting) or open an issue

**TL;DR - Start the app in 3 commands:**
```bash
npm install && cd client && npm install && cd ..  # Install dependencies
cp .env.example .env                              # Copy environment file (edit DB_PASSWORD and JWT_SECRET)
npm run dev                                       # Start the app → http://localhost:3000
```
*Note: Requires Node.js, PostgreSQL, and Redis installed. See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed setup.*

**💡 Verify your setup:** Run `./verify-setup.sh` to check if everything is configured correctly.

---

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

> **💡 For detailed setup instructions with prerequisites installation, troubleshooting, and step-by-step guidance, see [DEVELOPMENT.md](DEVELOPMENT.md)**

### Prerequisites

You need these installed on your system:
- ✅ **Node.js 18+** - [Installation guide](DEVELOPMENT.md#1-nodejs-v18-or-higher)
- ✅ **PostgreSQL 13+** - [Installation guide](DEVELOPMENT.md#2-postgresql-v13-or-higher)
- ✅ **Redis 6+** - [Installation guide](DEVELOPMENT.md#3-redis-v6-or-higher)

### Installation Steps

```bash
# 1. Clone the repository
git clone <repository-url>
cd hathor-red

# 2. Install dependencies
npm install && cd client && npm install && cd ..

# 3. Setup PostgreSQL database
createdb hathor_music
psql -U postgres -d hathor_music -f database/schema.sql
# Optional: psql -U postgres -d hathor_music -f database/seed.sql

# 4. Start Redis (in a separate terminal)
redis-server

# 5. Configure environment
cp .env.example .env
# Edit .env: Set DB_PASSWORD and generate JWT_SECRET with: openssl rand -base64 32

# 6. Start the application
npm run dev
```

### Access the Application

Once started, the application will be available at:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/api
- **Health Check:** http://localhost:5000/api/health

### First Time Usage

1. Open http://localhost:3000 in your browser
2. Click "Sign Up" to create an account
3. Login with your credentials
4. Start exploring the music platform!

### Need Help?

- **Setup issues?** → [Troubleshooting Guide](DEVELOPMENT.md#troubleshooting)
- **Want more details?** → [Complete Development Guide](DEVELOPMENT.md)
- **API documentation?** → [API.md](API.md)

## 📖 Documentation

- **[DEVELOPMENT.md](DEVELOPMENT.md)** - **⭐ Start here!** Complete development setup guide
- **[QUICKSTART.md](QUICKSTART.md)** - Abbreviated quick reference guide
- **[API Documentation](API.md)** - Complete REST API and WebSocket reference
- **[Deployment Guide](DEPLOYMENT.md)** - Production deployment instructions
- **[Features Overview](FEATURES.md)** - Detailed feature descriptions

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

## 🙏 Acknowledgments

- Built with React, Node.js, PostgreSQL, Redis, and Socket.io
- Uses Web Audio API for advanced audio processing
- Inspired by modern music streaming platforms

## 📧 Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

**Built with ❤️ for music lovers everywhere**
