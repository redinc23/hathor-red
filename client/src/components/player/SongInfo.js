import React from 'react';

const SongInfo = ({ currentSong }) => {
  return (
    <div className="song-info">
      {currentSong.cover_url && (
        <img src={currentSong.cover_url} alt={currentSong.title} className="song-cover" />
      )}
      <div className="song-details">
        <h3>{currentSong.title}</h3>
        <p>{currentSong.artist}</p>
      </div>
    </div>
  );
};

export default SongInfo;
