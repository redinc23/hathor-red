/**
 * Database Seed Script
 *
 * This script seeds the database with sample data for development.
 * It properly hashes passwords using bcrypt instead of using placeholder hashes.
 *
 * Usage: node database/seed.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'hathor_music',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

// Sample users with plain text passwords that will be hashed
const sampleUsers = [
  { username: 'demo_user', email: 'demo@example.com', password: 'password123', displayName: 'Demo User' },
  { username: 'john_doe', email: 'john@example.com', password: 'password123', displayName: 'John Doe' },
  { username: 'jane_smith', email: 'jane@example.com', password: 'password123', displayName: 'Jane Smith' }
];

// Sample songs (file paths relative to project root, matching uploadSong controller format)
const sampleSongs = [
  { title: 'Summer Vibes', artist: 'The Artists', album: 'Chill Collection', duration: 180, filePath: '/uploads/sample-summer-vibes.mp3', genre: 'Electronic', year: 2023, uploadedBy: 1 },
  { title: 'Midnight Jazz', artist: 'Jazz Ensemble', album: 'Night Sessions', duration: 240, filePath: '/uploads/sample-midnight-jazz.mp3', genre: 'Jazz', year: 2022, uploadedBy: 1 },
  { title: 'Rock Anthem', artist: 'The Rockers', album: 'Greatest Hits', duration: 210, filePath: '/uploads/sample-rock-anthem.mp3', genre: 'Rock', year: 2021, uploadedBy: 2 },
  { title: 'Classical Dreams', artist: 'Orchestra Plus', album: 'Symphonies', duration: 300, filePath: '/uploads/sample-classical-dreams.mp3', genre: 'Classical', year: 2020, uploadedBy: 2 },
  { title: 'Hip Hop Beat', artist: 'MC Flow', album: 'Rhymes', duration: 195, filePath: '/uploads/sample-hiphop-beat.mp3', genre: 'Hip Hop', year: 2023, uploadedBy: 3 }
];

// Sample playlists
const samplePlaylists = [
  { userId: 1, name: 'My Favorites', description: 'Collection of my favorite tracks', isPublic: true },
  { userId: 1, name: 'Workout Mix', description: 'High energy songs for exercise', isPublic: true },
  { userId: 2, name: 'Chill Sessions', description: 'Relaxing music for study', isPublic: true }
];

// Playlist-song associations
const playlistSongs = [
  { playlistId: 1, songId: 1, position: 1 },
  { playlistId: 1, songId: 2, position: 2 },
  { playlistId: 1, songId: 3, position: 3 },
  { playlistId: 2, songId: 3, position: 1 },
  { playlistId: 2, songId: 5, position: 2 },
  { playlistId: 3, songId: 1, position: 1 },
  { playlistId: 3, songId: 2, position: 2 },
  { playlistId: 3, songId: 4, position: 3 }
];

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function clearDatabase(client) {
  console.log('Clearing existing data...');
  await client.query('TRUNCATE playlist_songs, playlists, listening_history, playback_states, songs, users RESTART IDENTITY CASCADE');
}

async function seedUsers(client) {
  console.log('Seeding users...');
  for (const user of sampleUsers) {
    const passwordHash = await hashPassword(user.password);
    await client.query(
      'INSERT INTO users (username, email, password_hash, display_name) VALUES ($1, $2, $3, $4)',
      [user.username, user.email, passwordHash, user.displayName]
    );
    console.log(`  Created user: ${user.username}`);
  }
}

async function seedSongs(client) {
  console.log('Seeding songs...');
  for (const song of sampleSongs) {
    await client.query(
      'INSERT INTO songs (title, artist, album, duration, file_path, genre, year, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [song.title, song.artist, song.album, song.duration, song.filePath, song.genre, song.year, song.uploadedBy]
    );
    console.log(`  Added song: ${song.title}`);
  }
}

async function seedPlaylists(client) {
  console.log('Seeding playlists...');
  for (const playlist of samplePlaylists) {
    await client.query(
      'INSERT INTO playlists (user_id, name, description, is_public) VALUES ($1, $2, $3, $4)',
      [playlist.userId, playlist.name, playlist.description, playlist.isPublic]
    );
    console.log(`  Created playlist: ${playlist.name}`);
  }
}

async function seedPlaylistSongs(client) {
  console.log('Seeding playlist songs...');
  for (const ps of playlistSongs) {
    await client.query(
      'INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES ($1, $2, $3)',
      [ps.playlistId, ps.songId, ps.position]
    );
  }
  console.log(`  Added ${playlistSongs.length} songs to playlists`);
}

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await clearDatabase(client);
    await seedUsers(client);
    await seedSongs(client);
    await seedPlaylists(client);
    await seedPlaylistSongs(client);

    await client.query('COMMIT');
    console.log('\nDatabase seeded successfully!');
    console.log('\nTest credentials:');
    console.log('  Username: demo_user, john_doe, or jane_smith');
    console.log('  Password: password123');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the seed function
seed().catch(console.error);
