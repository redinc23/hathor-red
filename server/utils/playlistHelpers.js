const db = require('../config/database');

/**
 * Bulk insert songs into a playlist
 * @param {number} playlistId - The playlist ID
 * @param {Array} songs - Array of song objects with id property
 * @returns {Promise<void>}
 */
const bulkInsertPlaylistSongs = async (playlistId, songs) => {
  if (songs.length === 0) {
    return;
  }

  const values = [];
  const placeholders = [];
  let paramIndex = 1;

  songs.forEach((song, index) => {
    placeholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
    values.push(playlistId, song.id, index + 1);
  });

  const insertQuery = `INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES ${placeholders.join(', ')}`;
  await db.query(insertQuery, values);
};

module.exports = {
  bulkInsertPlaylistSongs
};
