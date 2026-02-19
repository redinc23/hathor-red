// Mock the auth utils to avoid loading real dependencies like jsonwebtoken/bcryptjs
jest.mock('../utils/auth', () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
  generateToken: jest.fn(),
}));

const { getProfile } = require('../controllers/authController');
const db = require('../config/database');

// Mock the database module
jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

describe('Auth Controller - getProfile', () => {
  let req;
  let res;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock request object
    req = {
      user: {
        userId: 1,
      },
    };

    // Mock response object
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it('should return user profile when user exists', async () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      display_name: 'Test User',
      avatar_url: 'http://example.com/avatar.png',
      created_at: new Date().toISOString(),
    };

    // Mock db.query to return the user
    db.query.mockResolvedValue({
      rows: [mockUser],
    });

    await getProfile(req, res);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT id, username, email, display_name, avatar_url, created_at FROM users WHERE id = $1'),
      [req.user.userId]
    );
    expect(res.json).toHaveBeenCalledWith({ user: mockUser });
  });

  it('should return 404 when user does not exist', async () => {
    // Mock db.query to return no rows
    db.query.mockResolvedValue({
      rows: [],
    });

    await getProfile(req, res);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT id, username, email, display_name, avatar_url, created_at FROM users WHERE id = $1'),
      [req.user.userId]
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
  });

  it('should return 500 when database error occurs', async () => {
    const error = new Error('Database connection failed');

    // Mock db.query to throw an error
    db.query.mockRejectedValue(error);

    // Spy on console.error to suppress error output during test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await getProfile(req, res);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT id, username, email, display_name, avatar_url, created_at FROM users WHERE id = $1'),
      [req.user.userId]
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });

    consoleSpy.mockRestore();
  });
});
