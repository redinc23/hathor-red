import React from 'react';

const VolumeControl = ({ volume, changeVolume }) => {
  return (
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
  );
};

export default VolumeControl;
