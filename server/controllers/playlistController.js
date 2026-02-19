const db = require('../config/database');
const colabAIService = require('../services/colabAIService');

const getPlaylists = async (req, res) => {
  try {
    const { userId } = req.user;

    const result = await db.query(
      'SELECT * FROM playlists WHERE user_id = $1 OR is_public = true ORDER BY created_at DESC',
      [userId]
    );

    res.json({ playlists: result.rows });
  } catch (error) {
    console.error('Get playlists error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getPlaylistById = async (req, res) => {
  try {
    const { id } = req.params;

    const playlistResult = await db.query(
      'SELECT * FROM playlists WHERE id = $1',
      [id]
    );

    if (playlistResult.rows.length === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const playlist = playlistResult.rows[0];

    if (!playlist.is_public && playlist.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const songsResult = await db.query(
      `SELECT s.*, ps.position 
       FROM songs s 
       JOIN playlist_songs ps ON s.id = ps.song_id 
       WHERE ps.playlist_id = $1 
       ORDER BY ps.position`,
      [id]
    );

    res.json({
      playlist,
      songs: songsResult.rows
    });
  } catch (error) {
    console.error('Get playlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createPlaylist = async (req, res) => {
  try {
    const { name, description, isPublic } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Playlist name is required' });
    }

    const result = await db.query(
      'INSERT INTO playlists (user_id, name, description, is_public) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.userId, name, description || null, isPublic || false]
    );

    res.status(201).json({
      message: 'Playlist created successfully',
      playlist: result.rows[0]
    });
  } catch (error) {
    console.error('Create playlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const addSongToPlaylist = async (req, res) => {
  try {
    const { playlistId, songId } = req.body;

    const playlistResult = await db.query(
      'SELECT user_id FROM playlists WHERE id = $1',
      [playlistId]
    );

    if (playlistResult.rows.length === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    if (playlistResult.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const maxPositionResult = await db.query(
      'SELECT COALESCE(MAX(position), 0) as max_pos FROM playlist_songs WHERE playlist_id = $1',
      [playlistId]
    );

    const position = maxPositionResult.rows[0].max_pos + 1;

    await db.query(
      'INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES ($1, $2, $3)',
      [playlistId, songId, position]
    );

    res.json({ message: 'Song added to playlist' });
  } catch (error) {
    if (error.constraint === 'playlist_songs_playlist_id_song_id_key') {
      return res.status(409).json({ error: 'Song already in playlist' });
    }
    console.error('Add song to playlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const generateAIPlaylist = async (req, res) => {
  try {
    const { prompt, name, songCount = 10 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Get user's listening history for context
    const historyResult = await db.query(
      `SELECT s.genre, s.artist, COUNT(*) as play_count
       FROM listening_history lh
       JOIN songs s ON lh.song_id = s.id
       WHERE lh.user_id = $1
       GROUP BY s.genre, s.artist
       ORDER BY play_count DESC
       LIMIT 20`,
      [req.user.userId]
    );

    const context = {
      history: historyResult.rows,
      favoriteGenres: [...new Set(historyResult.rows.map(r => r.genre).filter(Boolean))]
    };

    // Use Colab AI service to analyze the prompt
    const analysis = await colabAIService.analyzePlaylistPrompt(prompt, context);

    // Build query based on AI analysis
    let genres = analysis.genres || [];

    // Fallback to keyword matching if no genres detected
    if (genres.length === 0) {
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

    query += ' ORDER BY RANDOM()';
    query += ` LIMIT $${paramIndex}`;
    params.push(Math.min(songCount, 50));

    const songsResult = await db.query(query, params);

    const playlistName = name || `AI Playlist: ${prompt.slice(0, 30)}`;
    const description = analysis.description || `Generated from prompt: ${prompt}`;

    const playlistResult = await db.query(
      'INSERT INTO playlists (user_id, name, description, is_ai_generated, prompt) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.userId, playlistName, description, true, prompt]
    );

    const playlist = playlistResult.rows[0];

    if (songsResult.rows.length > 0) {
      const values = [];
      const placeholders = [];
      let batchParamIndex = 1;

      songsResult.rows.forEach((song, index) => {
        placeholders.push(`($${batchParamIndex++}, $${batchParamIndex++}, $${batchParamIndex++})`);
        values.push(playlist.id, song.id, index + 1);
      });

      const insertQuery = `INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES ${placeholders.join(', ')}`;
      await db.query(insertQuery, values);
    }

    res.status(201).json({
      message: 'AI playlist generated successfully',
      playlist,
      songs: songsResult.rows,
      analysis: {
        mood: analysis.mood,
        genres: genres,
        description: description
      }
    });
  } catch (error) {
    console.error('Generate AI playlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deletePlaylist = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM playlists WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Playlist not found or access denied' });
    }

    res.json({ message: 'Playlist deleted successfully' });
  } catch (error) {
    console.error('Delete playlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getPlaylists,
  getPlaylistById,
  createPlaylist,
  addSongToPlaylist,
  generateAIPlaylist,
  deletePlaylist
};
