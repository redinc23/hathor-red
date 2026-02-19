import React, { useEffect } from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import './player/Player.css';

import SongInfo from './player/SongInfo';
import PlayerControls from './player/PlayerControls';
import VolumeControl from './player/VolumeControl';
import VibeControls from './player/VibeControls';
import StemControls from './player/StemControls';

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
        <SongInfo currentSong={currentSong} />

        <PlayerControls
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          pause={pause}
          resume={resume}
          seek={seek}
        />

        <VolumeControl
          volume={volume}
          changeVolume={changeVolume}
        />
      </div>

      <div className="player-advanced">
        <VibeControls
          playbackSpeed={playbackSpeed}
          pitchShift={pitchShift}
          changePlaybackSpeed={changePlaybackSpeed}
          changePitchShift={changePitchShift}
        />

        <StemControls
          stemsConfig={stemsConfig}
          toggleStem={toggleStem}
        />
      </div>
    </div>
  );
};

export default Player;
