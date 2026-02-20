const aiController = require('../controllers/aiController');
const colabAIService = require('../services/colabAIService');

// Mock dependencies
jest.mock('../config/database', () => ({
  query: jest.fn(),
  pool: {
    on: jest.fn(),
  }
}));

jest.mock('../services/colabAIService', () => ({
  analyzePlaylistPrompt: jest.fn(),
  getStatus: jest.fn()
}));

const db = require('../config/database');

describe('AI Controller Performance', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      body: {
        prompt: 'test prompt',
        name: 'Test Playlist',
        songCount: 5
      },
      user: {
        userId: 'user-123'
      }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  it('should detect N+1 insert queries when generating a playlist', async () => {
    // 1. Mock history query
    db.query.mockResolvedValueOnce({ rows: [] });

    // 2. Mock AI service analysis
    colabAIService.analyzePlaylistPrompt.mockResolvedValue({
      genres: ['Pop'],
      mood: { name: 'Happy', energy: 8 },
      description: 'A happy pop playlist'
    });

    // 3. Mock songs query (returns 5 songs)
    const mockSongs = Array.from({ length: 5 }, (_, i) => ({ id: `song-${i+1}`, title: `Song ${i+1}` }));
    db.query.mockResolvedValueOnce({ rows: mockSongs });

    // 4. Mock playlist creation
    db.query.mockResolvedValueOnce({ rows: [{ id: 'playlist-123' }] });

    // 5. Mock individual song inserts (N times)
    db.query.mockResolvedValue({ rows: [] });

    await aiController.generatePlaylist(req, res);

    // Verify calls
    // Count how many times INSERT INTO playlist_songs was called
    const insertCalls = db.query.mock.calls.filter(call =>
      call[0].includes('INSERT INTO playlist_songs')
    );

    console.log(`Number of INSERT calls: ${insertCalls.length}`);

    // With bulk insert, we expect 1 call for 5 songs
    expect(insertCalls.length).toBe(1);
  });
});
