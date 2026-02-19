import React from 'react';

const PlayerControls = ({ isPlaying, currentTime, duration, pause, resume, seek }) => {
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

  return (
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
  );
};

export default PlayerControls;
