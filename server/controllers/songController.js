const db = require('../config/database');
const path = require('path');

const getSongs = async (req, res) => {
  try {
    const { genre, search, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM songs WHERE 1=1';
    const params = [];

    if (genre) {
      params.push(genre);
      query += ` AND genre = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (title ILIKE $${params.length} OR artist ILIKE $${params.length} OR album ILIKE $${params.length})`;
    }

    query += ' ORDER BY created_at DESC';
    params.push(limit, offset);
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await db.query(query, params);

    res.json({ songs: result.rows });
  } catch (error) {
    console.error('Get songs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getSongById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query('SELECT * FROM songs WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }

    res.json({ song: result.rows[0] });
  } catch (error) {
    console.error('Get song error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const uploadSong = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { title, artist, album, duration, genre, year } = req.body;

    if (!title || !artist || !duration) {
      return res.status(400).json({ error: 'Title, artist, and duration are required' });
    }

    const filePath = `/uploads/${req.file.filename}`;

    const result = await db.query(
      'INSERT INTO songs (title, artist, album, duration, file_path, genre, year, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [title, artist, album || null, parseInt(duration), filePath, genre || null, year ? parseInt(year) : null, req.user.userId]
    );

    res.status(201).json({
      message: 'Song uploaded successfully',
      song: result.rows[0]
    });
  } catch (error) {
    console.error('Upload song error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

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

const recordListening = async (req, res) => {
  try {
    const { songId, duration } = req.body;

    await db.query(
      'INSERT INTO listening_history (user_id, song_id, duration_played) VALUES ($1, $2, $3)',
      [req.user.userId, songId, duration || 0]
    );

    res.json({ message: 'Listening recorded' });
  } catch (error) {
    console.error('Record listening error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getSongs,
  getSongById,
  uploadSong,
  streamSong,
  recordListening
};
