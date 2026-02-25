const jwt = require('jsonwebtoken');
const { verifyStreamToken } = require('../utils/streamToken');

function streamAuth(req, res, next) {
  try {
    const streamToken = req.query?.t;

    if (streamToken) {
      const decoded = verifyStreamToken(streamToken);
      req.user = { userId: decoded.userId, username: null };
      req.streamToken = decoded;
      return next();
    }

    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const match = authHeader.match(/^Bearer\s+(\S+)$/i);
    if (!match) {
      return res.status(401).json({ error: 'Invalid Authorization header format' });
    }

    const decoded = jwt.verify(match[1], process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
}

module.exports = streamAuth;
