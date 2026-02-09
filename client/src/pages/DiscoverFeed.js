import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../contexts/PlayerContext';
import './DiscoverFeed.css';

// Mock data for the discover feed
const MOODS = [
  { id: 'for-you', label: 'For You', emoji: '✨' },
  { id: 'meditative', label: 'Meditative', emoji: '🧘' },
  { id: 'focused', label: 'Focused', emoji: '🎯' },
  { id: 'energetic', label: 'Energetic', emoji: '⚡' },
  { id: 'chill', label: 'Chill', emoji: '🌊' },
  { id: 'upbeat', label: 'Upbeat', emoji: '🎉' },
  { id: 'melancholic', label: 'Melancholic', emoji: '🌧️' },
  { id: 'ambient', label: 'Ambient', emoji: '🌌' },
];

const MOCK_TRACKS = [
  {
    id: 1,
    title: 'Midnight Bloom',
    artist: 'Luna Waves',
    mood: 'meditative',
    duration: 245,
    coverUrl: 'https://picsum.photos/seed/track1/800/800',
    bgGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    id: 2,
    title: 'Electric Dreams',
    artist: 'Neon Pulse',
    mood: 'energetic',
    duration: 198,
    coverUrl: 'https://picsum.photos/seed/track2/800/800',
    bgGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    id: 3,
    title: 'Ocean Depths',
    artist: 'Coral Sound',
    mood: 'chill',
    duration: 312,
    coverUrl: 'https://picsum.photos/seed/track3/800/800',
    bgGradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  },
  {
    id: 4,
    title: 'Golden Hour',
    artist: 'Sunset Trio',
    mood: 'upbeat',
    duration: 226,
    coverUrl: 'https://picsum.photos/seed/track4/800/800',
    bgGradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  },
  {
    id: 5,
    title: 'Forest Whispers',
    artist: 'Earthtone',
    mood: 'ambient',
    duration: 389,
    coverUrl: 'https://picsum.photos/seed/track5/800/800',
    bgGradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  },
  {
    id: 6,
    title: 'Rainy Confession',
    artist: 'Grey Skies',
    mood: 'melancholic',
    duration: 267,
    coverUrl: 'https://picsum.photos/seed/track6/800/800',
    bgGradient: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
  },
  {
    id: 7,
    title: 'Code & Coffee',
    artist: 'Dev Beats',
    mood: 'focused',
    duration: 180,
    coverUrl: 'https://picsum.photos/seed/track7/800/800',
    bgGradient: 'linear-gradient(135deg, #c3cfe2 0%, #f5f7fa 100%)',
  },
  {
    id: 8,
    title: 'Starlight Serenade',
    artist: 'Cosmic Drift',
    mood: 'for-you',
    duration: 301,
    coverUrl: 'https://picsum.photos/seed/track8/800/800',
    bgGradient: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)',
  },
];

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const TrackCard = ({ track, onPlay, onLongPress, isActive }) => {
  const longPressTimer = useRef(null);
  const [pressing, setPressing] = useState(false);

  const handlePointerDown = useCallback(() => {
    setPressing(true);
    longPressTimer.current = setTimeout(() => {
      onLongPress(track);
      setPressing(false);
    }, 600);
  }, [track, onLongPress]);

  const handlePointerUp = useCallback(() => {
    setPressing(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  return (
    <div
      className={`track-card ${isActive ? 'track-card--active' : ''} ${pressing ? 'track-card--pressing' : ''}`}
      style={{ background: track.bgGradient }}
    >
      <div className="track-card__image-container">
        <img
          src={track.coverUrl}
          alt={track.title}
          className="track-card__image"
          loading="lazy"
        />
        <div className="track-card__overlay" />
      </div>
      <div className="track-card__content">
        <div className="track-card__info">
          <h2 className="track-card__title">{track.title}</h2>
          <p className="track-card__artist">{track.artist}</p>
          <span className="track-card__duration">{formatTime(track.duration)}</span>
        </div>
        <div className="track-card__actions">
          <button
            className="track-card__play-btn"
            onClick={() => onPlay(track)}
            aria-label="Play track"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
          <button
            className="track-card__more-btn"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            aria-label="More options"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

const ActionSheet = ({ track, onClose, onAction }) => {
  if (!track) return null;

  const actions = [
    { id: 'add-queue', label: 'Add to Queue', icon: '📋' },
    { id: 'add-playlist', label: 'Add to Playlist', icon: '➕' },
    { id: 'share', label: 'Share Track', icon: '🔗' },
    { id: 'artist', label: 'Go to Artist', icon: '🎤' },
    { id: 'like', label: 'Like', icon: '❤️' },
  ];

  return (
    <div className="action-sheet-backdrop" onClick={onClose}>
      <div className="action-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="action-sheet__header">
          <img src={track.coverUrl} alt={track.title} className="action-sheet__thumb" />
          <div>
            <h3 className="action-sheet__title">{track.title}</h3>
            <p className="action-sheet__artist">{track.artist}</p>
          </div>
        </div>
        <div className="action-sheet__actions">
          {actions.map((action) => (
            <button
              key={action.id}
              className="action-sheet__btn"
              onClick={() => {
                onAction(action.id, track);
                onClose();
              }}
            >
              <span className="action-sheet__icon">{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
        <button className="action-sheet__cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
};

const MiniPlayer = ({ track, isPlaying, onToggle, onNavigate }) => {
  if (!track) return null;

  return (
    <div className="mini-player" onClick={onNavigate}>
      <img src={track.coverUrl} alt={track.title} className="mini-player__thumb" />
      <div className="mini-player__info">
        <span className="mini-player__title">{track.title}</span>
        <span className="mini-player__artist">{track.artist}</span>
      </div>
      <button
        className="mini-player__toggle"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
    </div>
  );
};

const DiscoverFeed = () => {
  const [activeMood, setActiveMood] = useState('for-you');
  const [actionSheetTrack, setActionSheetTrack] = useState(null);
  const [activeTrackId, setActiveTrackId] = useState(null);
  const feedRef = useRef(null);
  const navigate = useNavigate();
  const { playSong, currentSong, isPlaying, pause, resume } = usePlayer();

  const filteredTracks =
    activeMood === 'for-you'
      ? MOCK_TRACKS
      : MOCK_TRACKS.filter((t) => t.mood === activeMood);

  const handlePlay = useCallback(
    (track) => {
      setActiveTrackId(track.id);
      playSong({ id: track.id, title: track.title, artist: track.artist });
    },
    [playSong]
  );

  const handleLongPress = useCallback((track) => {
    setActionSheetTrack(track);
  }, []);

  const handleActionSheetAction = useCallback((actionId, track) => {
    console.log(`Action: ${actionId} on track: ${track.title}`);
  }, []);

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  }, [isPlaying, pause, resume]);

  const handleNavigateToPlayer = useCallback(() => {
    if (currentSong) {
      navigate(`/player/${currentSong.id}`);
    }
  }, [currentSong, navigate]);

  // Handle scroll snap observation
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const trackId = parseInt(entry.target.dataset.trackId, 10);
            if (trackId) setActiveTrackId(trackId);
          }
        });
      },
      { root: feed, threshold: 0.6 }
    );

    const cards = feed.querySelectorAll('.track-card');
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [filteredTracks]);

  return (
    <div className="discover-feed">
      {/* Mood Filter Chips */}
      <div className="mood-filters">
        <div className="mood-filters__scroll">
          {MOODS.map((mood) => (
            <button
              key={mood.id}
              className={`mood-chip ${activeMood === mood.id ? 'mood-chip--active' : ''}`}
              onClick={() => setActiveMood(mood.id)}
            >
              <span className="mood-chip__emoji">{mood.emoji}</span>
              <span className="mood-chip__label">{mood.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Vertical Feed */}
      <div className="feed-container" ref={feedRef}>
        {filteredTracks.length === 0 ? (
          <div className="feed-empty">
            <p>No tracks for this mood yet.</p>
            <button className="mood-chip mood-chip--active" onClick={() => setActiveMood('for-you')}>
              Show All
            </button>
          </div>
        ) : (
          filteredTracks.map((track) => (
            <div key={track.id} data-track-id={track.id} className="feed-snap-item">
              <TrackCard
                track={track}
                onPlay={handlePlay}
                onLongPress={handleLongPress}
                isActive={activeTrackId === track.id}
              />
            </div>
          ))
        )}
      </div>

      {/* Action Sheet */}
      <ActionSheet
        track={actionSheetTrack}
        onClose={() => setActionSheetTrack(null)}
        onAction={handleActionSheetAction}
      />

      {/* Mini Player */}
      <MiniPlayer
        track={
          currentSong
            ? MOCK_TRACKS.find((t) => t.id === currentSong.id) || {
                ...currentSong,
                coverUrl: 'https://picsum.photos/seed/default/100/100',
              }
            : null
        }
        isPlaying={isPlaying}
        onToggle={handleTogglePlay}
        onNavigate={handleNavigateToPlayer}
      />
    </div>
  );
};

export default DiscoverFeed;
