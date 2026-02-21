const db = require('../config/database');
const colabAIService = require('./colabAIService');

/**
 * Generate an AI-powered playlist based on a user prompt and listening history
 * @param {number} userId - ID of the user generating the playlist
 * @param {Object} options - Generation options
 * @param {string} options.prompt - Natural language description of the desired playlist
 * @param {string} [options.name] - Optional name for the playlist
 * @param {number} [options.songCount=10] - Number of songs to include
 * @returns {Promise<Object>} The generated playlist and included songs
 */
const generateAIPlaylist = async (userId, { prompt, name, songCount = 10 }) => {
  // 1. Get user's listening history for context
  const historyResult = await db.query(
    `SELECT s.genre, s.artist, COUNT(*) as play_count
     FROM listening_history lh
     JOIN songs s ON lh.song_id = s.id
     WHERE lh.user_id = $1
     GROUP BY s.genre, s.artist
     ORDER BY play_count DESC
     LIMIT 20`,
    [userId]
  );

  const context = {
    history: historyResult.rows,
    favoriteGenres: [...new Set(historyResult.rows.map(r => r.genre).filter(Boolean))]
  };

  // 2. Use Colab AI service to analyze the prompt
  const analysis = await colabAIService.analyzePlaylistPrompt(prompt, context);

  // 3. Build query based on AI analysis
  let genres = analysis.genres || [];

  // Fallback to keyword matching if no genres detected (from playlistController)
  // Skip fallback if keywords are present to avoid restricting keyword search
  if (genres.length === 0 && (!analysis.keywords || analysis.keywords.length === 0)) {
    const keywords = prompt.toLowerCase().split(' ');
    if (keywords.some(k => ['chill', 'relax', 'calm'].includes(k))) {
      genres.push('Jazz', 'Classical', 'Electronic');
    }
    if (keywords.some(k => ['workout', 'energy', 'pump'].includes(k))) {
      genres.push('Rock', 'Hip Hop', 'Electronic');
    }
    if (keywords.some(k => ['party', 'dance', 'club'].includes(k))) {
      genres.push('Electronic', 'Hip Hop');
    }
    if (genres.length === 0) {
      genres = ['Rock', 'Hip Hop', 'Electronic', 'Jazz', 'Classical'];
    }
  }

  // Build the songs query
  let query = 'SELECT * FROM songs WHERE 1=1';
  const params = [];
  let paramIndex = 1;

  if (genres.length > 0) {
    const placeholders = genres.map(() => `$${paramIndex++}`).join(',');
    query += ` AND genre IN (${placeholders})`;
    params.push(...genres);
  }

  // Filter by year/era if provided by AI
  if (analysis.era && analysis.era.start && analysis.era.end) {
    query += ` AND year >= $${paramIndex++} AND year <= $${paramIndex++}`;
    params.push(analysis.era.start, analysis.era.end);
  }

  // Add keyword search if available (from aiController)
  if (analysis.keywords && analysis.keywords.length > 0) {
    const keywordSearch = analysis.keywords.slice(0, 3).join(' ');
    query += ` AND (title ILIKE $${paramIndex} OR artist ILIKE $${paramIndex} OR album ILIKE $${paramIndex})`;
    params.push(`%${keywordSearch}%`);
    paramIndex++;
  }

  query += ' ORDER BY RANDOM()';
  query += ` LIMIT $${paramIndex}`;
  params.push(Math.min(songCount, 50));

  const songsResult = await db.query(query, params);

  // Determine playlist name and description
  const playlistName = name || `AI Playlist: ${prompt.slice(0, 30)}`;
  const description = analysis.description || `Generated from prompt: ${prompt}`;

  // 4. Create the playlist record
  const playlistResult = await db.query(
    'INSERT INTO playlists (user_id, name, description, is_ai_generated, prompt) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [userId, playlistName, description, true, prompt]
  );

  const playlist = playlistResult.rows[0];

  // 5. Add songs to playlist using batch insert
  if (songsResult.rows.length > 0) {
    const values = [];
    const placeholders = [];
    let insertParamIndex = 1;

    songsResult.rows.forEach((song, index) => {
      placeholders.push(`($${insertParamIndex++}, $${insertParamIndex++}, $${insertParamIndex++})`);
      values.push(playlist.id, song.id, index + 1);
    });

    const insertQuery = `INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES ${placeholders.join(', ')}`;
    await db.query(insertQuery, values);
  }

  return {
    playlist,
    songs: songsResult.rows,
    analysis: {
      mood: analysis.mood,
      genres: genres,
      description: description
    }
  };
};

module.exports = {
  generateAIPlaylist
};
