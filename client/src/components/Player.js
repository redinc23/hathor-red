import React, { useEffect } from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import './Player.css';

const Player = () => {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    playbackSpeed,
    pitchShift,
    stemsConfig,
    audioRef,
    pause,
    resume,
    seek,
    changeVolume,
    changePlaybackSpeed,
    changePitchShift,
    toggleStem,
    setCurrentTime,
    setDuration,
  } = usePlayer();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => pause();

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioRef, pause, setCurrentTime, setDuration]);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e) => {
    const percent = e.target.value / 100;
    seek(duration * percent);
  };

  if (!currentSong) {
    return (
      <div className="player-container">
        <div className="player-empty">
          <p>No song playing</p>
        </div>
        <audio ref={audioRef} />
      </div>
    );
  }

  return (
    <div className="player-container">
      <audio ref={audioRef} />
      
      <div className="player-main">
        <div className="song-info">
          {currentSong.cover_url && (
            <img src={currentSong.cover_url} alt={currentSong.title} className="song-cover" />
          )}
          <div className="song-details">
            <h3>{currentSong.title}</h3>
            <p>{currentSong.artist}</p>
          </div>
        </div>

        <div className="player-controls">
          <button onClick={isPlaying ? pause : resume} className="play-pause-btn">
            {isPlaying ? '⏸' : '▶'}
          </button>

          <div className="progress-container">
            <span className="time">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max="100"
              value={(currentTime / duration) * 100 || 0}
              onChange={handleSeek}
              className="progress-bar"
            />
            <span className="time">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="player-volume">
          <span>🔊</span>
          <input
            type="range"
            min="0"
            max="100"
            value={volume * 100}
            onChange={(e) => changeVolume(e.target.value / 100)}
            className="volume-slider"
          />
        </div>
      </div>

      <div className="player-advanced">
        <div className="vibe-controls">
          <h4>Vibe Controls</h4>
          
          <div className="control-group">
            <label>Speed: {playbackSpeed.toFixed(1)}x</label>
            <input
              type="range"
              min="50"
              max="200"
              value={playbackSpeed * 100}
              onChange={(e) => changePlaybackSpeed(e.target.value / 100)}
              className="control-slider"
            />
          </div>

          <div className="control-group">
            <label>Pitch: {pitchShift > 0 ? '+' : ''}{pitchShift}</label>
            <input
              type="range"
              min="-12"
              max="12"
              value={pitchShift}
              onChange={(e) => changePitchShift(parseInt(e.target.value))}
              className="control-slider"
            />
          </div>
        </div>

        <div className="stem-controls">
          <h4>Stem Separation</h4>
          <div className="stem-buttons">
            <button
              onClick={() => toggleStem('vocals')}
              className={stemsConfig.vocals ? 'stem-btn active' : 'stem-btn'}
            >
              Vocals
            </button>
            <button
              onClick={() => toggleStem('drums')}
              className={stemsConfig.drums ? 'stem-btn active' : 'stem-btn'}
            >
              Drums
            </button>
            <button
              onClick={() => toggleStem('bass')}
              className={stemsConfig.bass ? 'stem-btn active' : 'stem-btn'}
            >
              Bass
            </button>
            <button
              onClick={() => toggleStem('other')}
              className={stemsConfig.other ? 'stem-btn active' : 'stem-btn'}
            >
              Other
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Player;
