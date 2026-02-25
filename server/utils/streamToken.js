const jwt = require('jsonwebtoken');

const STREAM_TOKEN_EXPIRES_IN = process.env.STREAM_TOKEN_EXPIRE || '60s';

function signStreamToken({ userId, songId }) {
  return jwt.sign(
    { typ: 'stream', userId, songId },
    process.env.JWT_SECRET,
    { expiresIn: STREAM_TOKEN_EXPIRES_IN }
  );
}

function verifyStreamToken(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (!decoded || decoded.typ !== 'stream') {
    throw new Error('Invalid stream token');
  }
  return decoded;
}

module.exports = { signStreamToken, verifyStreamToken };
