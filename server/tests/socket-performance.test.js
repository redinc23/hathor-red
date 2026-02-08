const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const jwt = require('jsonwebtoken');

// Mock database before requiring handlers
jest.mock('../config/database', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
}));

// Mock jwt verify to always succeed for valid tokens in our test
jest.mock('jsonwebtoken', () => ({
  ...jest.requireActual('jsonwebtoken'),
  verify: jest.fn((token, secret) => {
    if (token === 'token-user1') return { userId: 1, username: 'user1' };
    if (token === 'token-user2') return { userId: 2, username: 'user2' };
    throw new Error('Invalid token');
  }),
}));

const setupSocketHandlers = require('../socket/handlers');

describe('Socket Performance & Broadcast Isolation', () => {
  let io, server, serverSocket, clientSocket1A, clientSocket1B, clientSocket2;

  beforeAll((done) => {
    process.env.JWT_SECRET = 'test-secret';
    const httpServer = createServer();
    io = new Server(httpServer);

    setupSocketHandlers(io);

    httpServer.listen(() => {
      const port = httpServer.address().port;

      // Connect User 1 (Device A)
      clientSocket1A = new Client(`http://localhost:${port}`, {
        auth: { token: 'token-user1' }
      });

      // Connect User 1 (Device B)
      clientSocket1B = new Client(`http://localhost:${port}`, {
        auth: { token: 'token-user1' }
      });

      // Connect User 2 (Device A)
      clientSocket2 = new Client(`http://localhost:${port}`, {
        auth: { token: 'token-user2' }
      });

      let connectedCount = 0;
      const onConnect = () => {
        connectedCount++;
        if (connectedCount === 3) done();
      };

      clientSocket1A.on('connect', onConnect);
      clientSocket1B.on('connect', onConnect);
      clientSocket2.on('connect', onConnect);
    });
  });

  afterAll(() => {
    io.close();
    clientSocket1A.close();
    clientSocket1B.close();
    clientSocket2.close();
  });

  test('sync-state should NOT broadcast to other users (Performance Check)', (done) => {
    const syncState = {
      currentSongId: 123,
      position: 45,
      isPlaying: true,
      volume: 80,
      playbackSpeed: 1,
      pitchShift: 0,
      stemsConfig: {}
    };

    // We expect User 2 should NOT receive the event
    // But initially (before fix), it WILL receive it.
    // So we use a spy or flag to detect reception.

    let user2Received = false;
    clientSocket2.on('sync-1', (data) => {
      user2Received = true;
    });

    // We expect User 1 (Device B) should ALWAYS receive the event
    let user1BReceived = false;
    clientSocket1B.on('sync-1', (data) => {
      user1BReceived = true;
      expect(data).toEqual(syncState);
    });

    // Emit from User 1 (Device A)
    clientSocket1A.emit('sync-state', syncState);

    // Wait for a short period to allow network propagation
    setTimeout(() => {
      try {
        // Current behavior: User 2 receives it (Bad for performance)
        // Optimized behavior: User 2 should NOT receive it

        // Asserting the Optimized behavior. This test should FAIL on current codebase.
        expect(user2Received).toBe(false);

        // Asserting functional correctness for same user
        expect(user1BReceived).toBe(true);

        done();
      } catch (error) {
        done(error);
      }
    }, 500);
  });
});
