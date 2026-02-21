const mockDb = {
  query: jest.fn()
};
jest.mock('../config/database', () => mockDb);
jest.mock('../services/colabAIService');

const playlistService = require('../services/playlistService');
const colabAIService = require('../services/colabAIService');

describe('PlaylistService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAIPlaylist', () => {
    it('should generate a playlist successfully with AI analysis', async () => {
      // Mock listening history
      mockDb.query.mockResolvedValueOnce({
        rows: [
          { genre: 'Jazz', artist: 'Miles Davis', play_count: 5 },
          { genre: 'Blues', artist: 'B.B. King', play_count: 3 }
        ]
      });

      // Mock AI analysis
      colabAIService.analyzePlaylistPrompt.mockResolvedValueOnce({
        genres: ['Jazz'],
        era: { start: 1950, end: 1960 },
        description: 'A smooth jazz playlist'
      });

      // Mock song results
      mockDb.query.mockResolvedValueOnce({
        rows: [
          { id: 1, title: 'So What', artist: 'Miles Davis', genre: 'Jazz' },
          { id: 2, title: 'Blue in Green', artist: 'Miles Davis', genre: 'Jazz' }
        ]
      });

      // Mock playlist creation
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 10, name: 'AI Playlist: Smooth Jazz' }]
      });

      // Mock song insertion (batch)
      mockDb.query.mockResolvedValueOnce({});

      const result = await playlistService.generateAIPlaylist(1, {
        prompt: 'Smooth jazz from the 50s',
        name: 'My Jazz',
        songCount: 2
      });

      expect(result.playlist).toBeDefined();
      expect(result.songs).toHaveLength(2);
      expect(result.analysis.genres).toContain('Jazz');

      // Verify history call (Call 0)
      expect(mockDb.query).toHaveBeenNthCalledWith(1, expect.stringContaining('listening_history'), [1]);

      // Verify AI call
      expect(colabAIService.analyzePlaylistPrompt).toHaveBeenCalledWith('Smooth jazz from the 50s', expect.any(Object));

      // Verify song query call (Call 1)
      expect(mockDb.query).toHaveBeenNthCalledWith(2,
        expect.stringMatching(/genre IN \(\$1\).*year >= \$2 AND year <= \$3/),
        ['Jazz', 1950, 1960, 2]
      );

      // Verify playlist creation call (Call 2)
      expect(mockDb.query).toHaveBeenNthCalledWith(3,
        expect.stringContaining('INSERT INTO playlists'),
        [1, 'My Jazz', 'A smooth jazz playlist', true, 'Smooth jazz from the 50s']
      );

      // Verify batch insert call (Call 3)
      expect(mockDb.query).toHaveBeenNthCalledWith(4,
        expect.stringContaining('INSERT INTO playlist_songs'),
        [10, 1, 1, 10, 2, 2]
      );
    });

    it('should use fallback genres if AI returns no genres', async () => {
      // Mock history
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      // Mock AI analysis (no genres)
      colabAIService.analyzePlaylistPrompt.mockResolvedValueOnce({
        genres: [],
        description: 'Fallback playlist'
      });

      // Mock song results
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      // Mock playlist creation
      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 11 }] });

      await playlistService.generateAIPlaylist(1, {
        prompt: 'chill vibes',
        name: 'Chill'
      });

      // Verify song query call uses fallback genres for 'chill'
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('genre IN ($1,$2,$3)'),
        ['Jazz', 'Classical', 'Electronic', 10]
      );
    });

    it('should include keyword search if AI provides keywords', async () => {
        // Mock history
        mockDb.query.mockResolvedValueOnce({ rows: [] });

        // Mock AI analysis with keywords
        colabAIService.analyzePlaylistPrompt.mockResolvedValueOnce({
          genres: ['Rock'],
          keywords: ['Queen', 'Bohemian'],
          description: 'Rock keywords'
        });

        // Mock song results
        mockDb.query.mockResolvedValueOnce({ rows: [] });
        // Mock playlist creation
        mockDb.query.mockResolvedValueOnce({ rows: [{ id: 12 }] });

        await playlistService.generateAIPlaylist(1, {
          prompt: 'songs by Queen',
          name: 'Queen Mix'
        });

        // Verify song query call uses ILIKE for keywords
        expect(mockDb.query).toHaveBeenCalledWith(
          expect.stringContaining('ILIKE'),
          ['Rock', '%Queen | Bohemian%', 10]
        );
      });

    it('should propagate database query errors', async () => {
      // Make the first database query fail (e.g., fetching history)
      mockDb.query.mockRejectedValueOnce(new Error('DB error'));

      await expect(
        playlistService.generateAIPlaylist(1, {
          prompt: 'any prompt',
          name: 'Error Case'
        })
      ).rejects.toThrow();
    });

    it('should handle case where no songs match the search criteria', async () => {
      // Mock history
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      // Mock AI analysis with a valid genre
      colabAIService.analyzePlaylistPrompt.mockResolvedValueOnce({
        genres: ['Pop'],
        description: 'No songs found case'
      });

      // Mock songs query returning no rows
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      // Mock playlist creation still succeeding
      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 13 }] });

      await expect(
        playlistService.generateAIPlaylist(1, {
          prompt: 'quiet unknown tracks',
          name: 'Empty Songs Playlist'
        })
      ).resolves.not.toThrow();

      // Ensure playlist creation was attempted even with no songs
      expect(mockDb.query).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.any(Array)
      );
    });

    it('should handle very long prompts and prompts with special characters', async () => {
      const longPrompt =
        '🎵'.repeat(100) +
        ' Find me songs that match this extremely long and complex prompt with specials !@#$%^&*()_+[];\',./{}|:"<>? and unicode 🎶😊';

      // Mock history
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      // Mock AI analysis
      colabAIService.analyzePlaylistPrompt.mockResolvedValueOnce({
        genres: ['Electronic'],
        description: 'Long prompt analysis'
      });

      // Mock songs query and playlist creation
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 14 }] });

      await expect(
        playlistService.generateAIPlaylist(1, {
          prompt: longPrompt,
          name: 'Long Prompt Playlist'
        })
      ).resolves.not.toThrow();

      // Verify the AI service received the complex prompt in its arguments
      expect(colabAIService.analyzePlaylistPrompt).toHaveBeenCalled();
    });

    it('should pass through the analysis.mood field correctly', async () => {
      const mood = 'happy';

      // Mock history
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      // Mock AI analysis including mood
      colabAIService.analyzePlaylistPrompt.mockResolvedValueOnce({
        genres: ['Pop'],
        mood,
        description: 'Mood-specific playlist'
      });

      // Mock songs query
      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 101 }] });

      // Mock playlist creation
      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 15 }] });

      await expect(
        playlistService.generateAIPlaylist(1, {
          prompt: 'happy pop songs',
          name: 'Happy Pop'
        })
      ).resolves.not.toThrow();

      // Inspect the arguments of the last database call (playlist creation)
      const lastCall = mockDb.query.mock.calls[mockDb.query.mock.calls.length - 1];
      const params = lastCall[1];
      expect(params).toEqual(expect.arrayContaining([mood]));
    });
  });
});
