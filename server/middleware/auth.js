const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {
  try {
    // Check both Authorization header and query parameter (for media tags)
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.query.token;

    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid authentication token' });
  }
};

module.exports = authMiddleware;
