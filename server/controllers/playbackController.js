const db = require('../config/database');
const { redisClient } = require('../config/redis');

const getPlaybackState = async (req, res) => {
  try {
    const { userId } = req.user;

    // Try Redis first for speed
    const cacheKey = `playback:${userId}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return res.json({ state: JSON.parse(cached) });
    }

    // Fallback to database
    const result = await db.query(
      'SELECT * FROM playback_states WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ state: null });
    }

    const state = result.rows[0];
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(state));

    res.json({ state });
  } catch (error) {
    console.error('Get playback state error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updatePlaybackState = async (req, res) => {
  try {
    const { userId } = req.user;
    const {
      currentSongId,
      position,
      isPlaying,
      volume,
      playbackSpeed,
      pitchShift,
      stemsConfig
    } = req.body;

    const result = await db.query(
      `INSERT INTO playback_states (user_id, current_song_id, position, is_playing, volume, playback_speed, pitch_shift, stems_config)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id) DO UPDATE SET
         current_song_id = COALESCE($2, playback_states.current_song_id),
         position = COALESCE($3, playback_states.position),
         is_playing = COALESCE($4, playback_states.is_playing),
         volume = COALESCE($5, playback_states.volume),
         playback_speed = COALESCE($6, playback_states.playback_speed),
         pitch_shift = COALESCE($7, playback_states.pitch_shift),
         stems_config = COALESCE($8, playback_states.stems_config),
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, currentSongId, position, isPlaying, volume, playbackSpeed, pitchShift, stemsConfig]
    );

    const state = result.rows[0];

    // Update Redis cache
    const cacheKey = `playback:${userId}`;
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(state));

    res.json({
      message: 'Playback state updated',
      state
    });
  } catch (error) {
    console.error('Update playback state error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getPlaybackState,
  updatePlaybackState
};
