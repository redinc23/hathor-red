import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Player from '../../Player'; // Adjusted import path
import { usePlayer } from '../../../contexts/PlayerContext';

jest.mock('../../../contexts/PlayerContext');

describe('Player Component', () => {
  const mockPause = jest.fn();
  const mockResume = jest.fn();
  const mockSeek = jest.fn();
  const mockChangeVolume = jest.fn();
  const mockChangePlaybackSpeed = jest.fn();
  const mockChangePitchShift = jest.fn();
  const mockToggleStem = jest.fn();

  const defaultContext = {
    currentSong: {
      id: '1',
      title: 'Test Song',
      artist: 'Test Artist',
      cover_url: 'test-cover.jpg',
    },
    isPlaying: false,
    currentTime: 10,
    duration: 100,
    volume: 0.5,
    playbackSpeed: 1.0,
    pitchShift: 0,
    stemsConfig: { vocals: true, drums: true, bass: true, other: true },
    audioRef: { current: { addEventListener: jest.fn(), removeEventListener: jest.fn() } },
    pause: mockPause,
    resume: mockResume,
    seek: mockSeek,
    changeVolume: mockChangeVolume,
    changePlaybackSpeed: mockChangePlaybackSpeed,
    changePitchShift: mockChangePitchShift,
    toggleStem: mockToggleStem,
    setCurrentTime: jest.fn(),
    setDuration: jest.fn(),
  };

  beforeEach(() => {
    usePlayer.mockReturnValue(defaultContext);
  });

  test('renders player with song info', () => {
    render(<Player />);
    expect(screen.getByText('Test Song')).toBeInTheDocument();
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
  });

  test('toggles play/pause', () => {
    render(<Player />);
    const playButton = screen.getByText('▶');
    fireEvent.click(playButton);
    expect(mockResume).toHaveBeenCalled();
  });

  test('calls pause when playing', () => {
    usePlayer.mockReturnValue({ ...defaultContext, isPlaying: true });
    render(<Player />);
    const pauseButton = screen.getByText('⏸');
    fireEvent.click(pauseButton);
    expect(mockPause).toHaveBeenCalled();
  });

  test('renders empty player when no song', () => {
    usePlayer.mockReturnValue({ ...defaultContext, currentSong: null });
    render(<Player />);
    expect(screen.getByText('No song playing')).toBeInTheDocument();
  });
});
