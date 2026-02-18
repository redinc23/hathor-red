import React, { createContext, useState, useContext, useRef, useEffect } from 'react';
import { musicService } from '../services/music';

const PlayerContext = createContext();

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};

export const PlayerProvider = ({ children }) => {
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [pitchShift, setPitchShift] = useState(0);
  const [stemsConfig, setStemsConfig] = useState({
    vocals: true,
    drums: true,
    bass: true,
    other: true,
  });

  const audioRef = useRef(null);
  const audioContextRef = useRef(null);

  useEffect(() => {
    // Initialize Web Audio API
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playSong = async (song) => {
    if (!song || !song.id) return;

    try {
      setCurrentSong(song);
      const streamUrl = musicService.streamSong(song.id);

      if (audioRef.current) {
        audioRef.current.src = streamUrl;
        audioRef.current.load();
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Failed to play song:', error);
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const resume = async () => {
    if (audioRef.current) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Failed to resume:', error);
      }
    }
  };

  const seek = (time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const changeVolume = (newVolume) => {
    const vol = Math.max(0, Math.min(1, newVolume));
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  const changePlaybackSpeed = (speed) => {
    const newSpeed = Math.max(0.5, Math.min(2, speed));
    setPlaybackSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  const changePitchShift = (shift) => {
    setPitchShift(shift);
    // Note: Actual pitch shifting would require more complex Web Audio API manipulation
    // This is a simplified version
  };

  const toggleStem = (stem) => {
    setStemsConfig((prev) => ({
      ...prev,
      [stem]: !prev[stem],
    }));
    // Note: Actual stem separation would require server-side processing
    // or a library like Spleeter.js
  };

  const syncState = async () => {
    try {
      await musicService.updatePlaybackState({
        currentSongId: currentSong?.id,
        position: currentTime,
        isPlaying,
        volume,
        playbackSpeed,
        pitchShift,
        stemsConfig,
      });
    } catch (error) {
      console.error('Failed to sync state:', error);
    }
  };

  const loadState = async () => {
    try {
      const { state } = await musicService.getPlaybackState();
      if (state) {
        setVolume(state.volume || 1.0);
        setPlaybackSpeed(state.playback_speed || 1.0);
        setPitchShift(state.pitch_shift || 0);
        setStemsConfig(state.stems_config || stemsConfig);
      }
    } catch (error) {
      console.error('Failed to load state:', error);
    }
  };

  const value = {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    playbackSpeed,
    pitchShift,
    stemsConfig,
    audioRef,
    playSong,
    pause,
    resume,
    seek,
    changeVolume,
    changePlaybackSpeed,
    changePitchShift,
    toggleStem,
    syncState,
    loadState,
    setCurrentTime,
    setDuration,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
};
