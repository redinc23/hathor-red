import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlayer } from '../contexts/PlayerContext';
import './ImmersivePlayer.css';

// Mock track data
const MOCK_TRACKS = {
  1: {
    id: 1,
    title: 'Midnight Bloom',
    artist: 'Luna Waves',
    album: 'Nocturnal Garden',
    duration: 245,
    coverUrl: 'https://picsum.photos/seed/track1/600/600',
    bgGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    lyrics: [
      { time: 0, text: '♪ Instrumental Intro ♪' },
      { time: 15, text: 'Under the midnight sky' },
      { time: 22, text: 'Flowers bloom in silver light' },
      { time: 30, text: 'Dancing with the shadows' },
      { time: 38, text: 'Everything feels just right' },
      { time: 48, text: '' },
      { time: 50, text: 'Petals falling softly down' },
      { time: 58, text: 'A garden growing underground' },
      { time: 66, text: 'Where dreams and moonbeams intertwine' },
      { time: 74, text: 'This midnight bloom is mine' },
      { time: 85, text: '' },
      { time: 88, text: '♪ Bridge ♪' },
      { time: 110, text: 'And when the morning comes' },
      { time: 118, text: 'We\'ll find what we\'ve become' },
      { time: 126, text: 'A garden of our own design' },
      { time: 134, text: 'Growing through the night...' },
    ],
  },
  2: {
    id: 2,
    title: 'Electric Dreams',
    artist: 'Neon Pulse',
    album: 'Synthetic Hearts',
    duration: 198,
    coverUrl: 'https://picsum.photos/seed/track2/600/600',
    bgGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    lyrics: [
      { time: 0, text: '♪ Synth Intro ♪' },
      { time: 12, text: 'Neon lights flicker and glow' },
      { time: 20, text: 'Electric pulses start to flow' },
      { time: 28, text: 'In a world of wires and code' },
      { time: 36, text: 'Our hearts carry the load' },
    ],
  },
};

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// Waveform Visualizer Component
const WaveformVisualizer = ({ isPlaying, progress }) => {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const barsRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const barCount = 64;
    const barWidth = canvas.width / barCount;

    if (barsRef.current.length === 0) {
      barsRef.current = Array.from({ length: barCount }, () => Math.random() * 0.3 + 0.1);
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      barsRef.current = barsRef.current.map((h, i) => {
        if (isPlaying) {
          const target = Math.random() * 0.8 + 0.2;
          return h + (target - h) * 0.15;
        }
        return h + (0.15 - h) * 0.05;
      });

      barsRef.current.forEach((h, i) => {
        const x = i * barWidth;
        const barH = h * canvas.height;
        const progressRatio = i / barCount;

        const gradient = ctx.createLinearGradient(x, canvas.height - barH, x, canvas.height);
        if (progressRatio <= progress) {
          gradient.addColorStop(0, 'rgba(102, 126, 234, 0.9)');
          gradient.addColorStop(1, 'rgba(118, 75, 162, 0.9)');
        } else {
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x + 1, canvas.height - barH, barWidth - 2, barH, 2);
        } else {
          ctx.rect(x + 1, canvas.height - barH, barWidth - 2, barH);
        }
        ctx.fill();
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, progress]);

  return (
    <canvas
      ref={canvasRef}
      className="waveform-canvas"
      width={640}
      height={120}
    />
  );
};

// Lyrics Panel Component
const LyricsPanel = ({ lyrics, currentTime, isOpen, onClose }) => {
  const activeLyricRef = useRef(null);

  const activeLyricIndex = useMemo(() => {
    if (!lyrics) return -1;
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (currentTime >= lyrics[i].time) return i;
    }
    return -1;
  }, [lyrics, currentTime]);

  useEffect(() => {
    if (activeLyricRef.current) {
      activeLyricRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeLyricIndex]);

  return (
    <div className={`lyrics-panel ${isOpen ? 'lyrics-panel--open' : ''}`}>
      <div className="lyrics-panel__header">
        <h3>Lyrics</h3>
        <button className="lyrics-panel__close" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>
      <div className="lyrics-panel__content">
        {lyrics && lyrics.map((line, i) => (
          <p
            key={i}
            ref={i === activeLyricIndex ? activeLyricRef : null}
            className={`lyrics-line ${i === activeLyricIndex ? 'lyrics-line--active' : ''} ${
              i < activeLyricIndex ? 'lyrics-line--past' : ''
            }`}
          >
            {line.text || '\u00A0'}
          </p>
        ))}
      </div>
    </div>
  );
};

const ImmersivePlayer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pause, resume, playSong } = usePlayer();

  const track = MOCK_TRACKS[id] || MOCK_TRACKS[1];

  const [localPlaying, setLocalPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showLyrics, setShowLyrics] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  // Reset local UI state when the active track changes
  useEffect(() => {
    setLocalPlaying(false);
    setCurrentTime(0);
    setShowLyrics(false);
    setTilt({ x: 0, y: 0 });
  }, [track.id]);
  const timerRef = useRef(null);
  const containerRef = useRef(null);

  // Simulate playback progress
  useEffect(() => {
    if (localPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= track.duration) {
            setLocalPlaying(false);
            return 0;
          }
          return prev + 0.25;
        });
      }, 250);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [localPlaying, track.duration]);

  const progress = track.duration > 0 ? currentTime / track.duration : 0;

  const handleTogglePlay = useCallback(() => {
    setLocalPlaying((prev) => !prev);
    if (localPlaying) {
      pause();
    } else {
      playSong({ id: track.id, title: track.title, artist: track.artist });
    }
  }, [localPlaying, pause, resume, playSong, track]);

  const handleSeek = useCallback(
    (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setCurrentTime(ratio * track.duration);
    },
    [track.duration]
  );

  // Parallax tilt effect
  const handleMouseMove = useCallback((e) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setTilt({ x: y * -12, y: x * 12 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

  const handleClose = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return (
    <div
      className="immersive-player"
      style={{ background: track.bgGradient }}
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background blur */}
      <div className="immersive-player__bg">
        <img src={track.coverUrl} alt="" className="immersive-player__bg-img" />
      </div>

      {/* Close button */}
      <button className="immersive-player__close" onClick={handleClose} aria-label="Close player">
        <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      </button>

      {/* Album Art */}
      <div className="immersive-player__artwork-wrapper">
        <div
          className="immersive-player__artwork"
          style={{
            transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          }}
        >
          <img src={track.coverUrl} alt={track.title} className="immersive-player__cover" />
          <div className={`immersive-player__vinyl ${localPlaying ? 'spinning' : ''}`} />
        </div>
      </div>

      {/* Track Info */}
      <div className="immersive-player__info">
        <h1 className="immersive-player__title">{track.title}</h1>
        <p className="immersive-player__artist">{track.artist}</p>
        <p className="immersive-player__album">{track.album}</p>
      </div>

      {/* Waveform */}
      <div className="immersive-player__waveform">
        <WaveformVisualizer isPlaying={localPlaying} progress={progress} />
      </div>

      {/* Progress Bar */}
      <div className="immersive-player__progress-area">
        <span className="immersive-player__time">{formatTime(currentTime)}</span>
        <div className="immersive-player__progress-bar" onClick={handleSeek}>
          <div className="immersive-player__progress-track">
            <div
              className="immersive-player__progress-fill"
              style={{ width: `${progress * 100}%` }}
            />
            <div
              className="immersive-player__progress-thumb"
              style={{ left: `${progress * 100}%` }}
            />
          </div>
        </div>
        <span className="immersive-player__time">{formatTime(track.duration)}</span>
      </div>

      {/* Controls */}
      <div className="immersive-player__controls">
        <button className="immersive-player__ctrl-btn" aria-label="Shuffle">
          <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
            <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
          </svg>
        </button>
        <button className="immersive-player__ctrl-btn" aria-label="Previous">
          <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>
        <button
          className="immersive-player__play-btn"
          onClick={handleTogglePlay}
          aria-label={localPlaying ? 'Pause' : 'Play'}
        >
          {localPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor" width="36" height="36">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" width="36" height="36">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <button className="immersive-player__ctrl-btn" aria-label="Next">
          <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>
        <button
          className={`immersive-player__ctrl-btn ${showLyrics ? 'active' : ''}`}
          onClick={() => setShowLyrics(!showLyrics)}
          aria-label="Lyrics"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
            <path d="M3 9h14V7H3v2zm0 4h14v-2H3v2zm0 4h10v-2H3v2zm16-4h2v-2h-2v2zm0-4v2h2V9h-2zm0 8h2v-2h-2v2z" />
          </svg>
        </button>
      </div>

      {/* Lyrics Panel */}
      <LyricsPanel
        lyrics={track.lyrics}
        currentTime={currentTime}
        isOpen={showLyrics}
        onClose={() => setShowLyrics(false)}
      />
    </div>
  );
};

export default ImmersivePlayer;
