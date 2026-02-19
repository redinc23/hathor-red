import React from 'react';

const VibeControls = ({ playbackSpeed, pitchShift, changePlaybackSpeed, changePitchShift }) => {
  return (
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
  );
};

export default VibeControls;
