import React, { useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlayer } from '../contexts/PlayerContext';
import './PlaylistDetail.css';

// Mock playlist data
const MOCK_PLAYLISTS = {
  1: {
    id: 1,
    title: 'Late Night Coding',
    description: 'Ambient beats to fuel your late-night coding sessions',
    coverUrl: 'https://picsum.photos/seed/playlist1/600/600',
    bgGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    isCollaborative: true,
    createdBy: 'Luna Waves',
    totalDuration: 3845,
    collaborators: [
      { id: 1, name: 'Luna', avatar: 'https://i.pravatar.cc/80?u=luna' },
      { id: 2, name: 'Neon', avatar: 'https://i.pravatar.cc/80?u=neon' },
      { id: 3, name: 'Coral', avatar: 'https://i.pravatar.cc/80?u=coral' },
      { id: 4, name: 'Dev', avatar: 'https://i.pravatar.cc/80?u=dev' },
    ],
    tracks: [
      { id: 1, title: 'Midnight Bloom', artist: 'Luna Waves', duration: 245, coverUrl: 'https://picsum.photos/seed/track1/100/100' },
      { id: 2, title: 'Electric Dreams', artist: 'Neon Pulse', duration: 198, coverUrl: 'https://picsum.photos/seed/track2/100/100' },
      { id: 3, title: 'Ocean Depths', artist: 'Coral Sound', duration: 312, coverUrl: 'https://picsum.photos/seed/track3/100/100' },
      { id: 4, title: 'Golden Hour', artist: 'Sunset Trio', duration: 226, coverUrl: 'https://picsum.photos/seed/track4/100/100' },
      { id: 5, title: 'Forest Whispers', artist: 'Earthtone', duration: 389, coverUrl: 'https://picsum.photos/seed/track5/100/100' },
      { id: 6, title: 'Rainy Confession', artist: 'Grey Skies', duration: 267, coverUrl: 'https://picsum.photos/seed/track6/100/100' },
      { id: 7, title: 'Code & Coffee', artist: 'Dev Beats', duration: 180, coverUrl: 'https://picsum.photos/seed/track7/100/100' },
      { id: 8, title: 'Starlight Serenade', artist: 'Cosmic Drift', duration: 301, coverUrl: 'https://picsum.photos/seed/track8/100/100' },
      { id: 9, title: 'Binary Sunset', artist: 'Pixel Dream', duration: 278, coverUrl: 'https://picsum.photos/seed/track9/100/100' },
      { id: 10, title: 'Cloud Atlas', artist: 'Skyline', duration: 334, coverUrl: 'https://picsum.photos/seed/track10/100/100' },
    ],
  },
  2: {
    id: 2,
    title: 'Morning Energy',
    description: 'Upbeat tracks to kickstart your morning routine',
    coverUrl: 'https://picsum.photos/seed/playlist2/600/600',
    bgGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    isCollaborative: false,
    createdBy: 'Neon Pulse',
    totalDuration: 2156,
    collaborators: [],
    tracks: [
      { id: 11, title: 'Rise & Shine', artist: 'Morning Star', duration: 210, coverUrl: 'https://picsum.photos/seed/track11/100/100' },
      { id: 12, title: 'Coffee Run', artist: 'Brew Crew', duration: 185, coverUrl: 'https://picsum.photos/seed/track12/100/100' },
      { id: 13, title: 'Sunny Side Up', artist: 'Dawn Patrol', duration: 240, coverUrl: 'https://picsum.photos/seed/track13/100/100' },
    ],
  },
};

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatDuration = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }
  return `${minutes} min`;
};

const PlaylistDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playSong } = usePlayer();

  const playlist = MOCK_PLAYLISTS[id] || MOCK_PLAYLISTS[1];
  const [tracks, setTracks] = useState(playlist.tracks);
  const [draggingIdx, setDraggingIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  const handlePlayAll = useCallback(() => {
    if (tracks.length > 0) {
      playSong({ id: tracks[0].id, title: tracks[0].title, artist: tracks[0].artist });
      console.log('Playing all tracks starting with:', tracks[0].title);
    }
  }, [tracks, playSong]);

  const handlePlayTrack = useCallback(
    (track) => {
      playSong({ id: track.id, title: track.title, artist: track.artist });
      navigate(`/player/${track.id}`);
    },
    [playSong, navigate]
  );

  const handleRemoveTrack = useCallback(
    (trackId) => {
      setTracks((prev) => prev.filter((t) => t.id !== trackId));
      console.log('Removed track:', trackId);
    },
    []
  );

  const handleShare = useCallback(() => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        console.log('Playlist URL copied to clipboard');
        alert('Playlist link copied to clipboard!');
      });
    } else {
      console.log('Share URL:', url);
      alert('Share link: ' + url);
    }
  }, []);

  // Native HTML5 drag and drop
  const handleDragStart = useCallback((e, idx) => {
    dragItem.current = idx;
    setDraggingIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    // Set drag image
    if (e.target.closest) {
      const row = e.target.closest('.playlist-track');
      if (row) {
        e.dataTransfer.setDragImage(row, 50, 25);
      }
    }
  }, []);

  const handleDragOver = useCallback((e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOverItem.current = idx;
    setDragOverIdx(idx);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      setTracks((prev) => {
        const updated = [...prev];
        const [removed] = updated.splice(dragItem.current, 1);
        updated.splice(dragOverItem.current, 0, removed);
        return updated;
      });
      console.log(`Moved track from position ${dragItem.current + 1} to ${dragOverItem.current + 1}`);
    }
    setDraggingIdx(null);
    setDragOverIdx(null);
    dragItem.current = null;
    dragOverItem.current = null;
  }, []);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return (
    <div className="playlist-detail">
      {/* Header */}
      <div className="playlist-header" style={{ background: playlist.bgGradient }}>
        <div className="playlist-header__bg">
          <img src={playlist.coverUrl} alt="" className="playlist-header__bg-img" />
        </div>
        <button className="playlist-header__back" onClick={handleBack} aria-label="Go back">
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <div className="playlist-header__content">
          <img src={playlist.coverUrl} alt={playlist.title} className="playlist-header__cover" />
          <div className="playlist-header__info">
            <h1 className="playlist-header__title">{playlist.title}</h1>
            <p className="playlist-header__description">{playlist.description}</p>
            <div className="playlist-header__stats">
              <span>{tracks.length} tracks</span>
              <span className="playlist-header__dot">·</span>
              <span>{formatDuration(playlist.totalDuration)}</span>
              <span className="playlist-header__dot">·</span>
              <span>by {playlist.createdBy}</span>
            </div>

            {/* Collaborators */}
            {playlist.isCollaborative && playlist.collaborators.length > 0 && (
              <div className="playlist-header__collaborators">
                <div className="collaborator-avatars">
                  {playlist.collaborators.map((collab, i) => (
                    <img
                      key={collab.id}
                      src={collab.avatar}
                      alt={collab.name}
                      className="collaborator-avatar"
                      style={{ zIndex: playlist.collaborators.length - i }}
                      title={collab.name}
                    />
                  ))}
                </div>
                <span className="collaborator-label">
                  {playlist.collaborators.length} collaborator{playlist.collaborators.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="playlist-header__actions">
          <button className="playlist-action-btn playlist-action-btn--primary" onClick={handlePlayAll}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
              <path d="M8 5v14l11-7z" />
            </svg>
            Play All
          </button>
          <button className="playlist-action-btn" onClick={handleShare}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
            </svg>
            Share
          </button>
        </div>
      </div>

      {/* Track List */}
      <div className="playlist-tracks">
        <div className="playlist-tracks__header">
          <span className="playlist-tracks__col-num">#</span>
          <span className="playlist-tracks__col-title">Title</span>
          <span className="playlist-tracks__col-duration">Duration</span>
          <span className="playlist-tracks__col-actions"></span>
        </div>

        {tracks.map((track, idx) => (
          <div
            key={track.id}
            className={`playlist-track ${draggingIdx === idx ? 'playlist-track--dragging' : ''} ${
              dragOverIdx === idx ? 'playlist-track--drag-over' : ''
            }`}
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDragEnd={handleDragEnd}
          >
            <div className="playlist-track__grip" aria-label="Drag to reorder">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </div>
            <span className="playlist-track__num">{idx + 1}</span>
            <img src={track.coverUrl} alt={track.title} className="playlist-track__thumb" />
            <div className="playlist-track__info" onClick={() => handlePlayTrack(track)}>
              <span className="playlist-track__title">{track.title}</span>
              <span className="playlist-track__artist">{track.artist}</span>
            </div>
            <span className="playlist-track__duration">{formatTime(track.duration)}</span>
            <button
              className="playlist-track__remove"
              onClick={() => handleRemoveTrack(track.id)}
              aria-label={`Remove ${track.title}`}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
        ))}

        {tracks.length === 0 && (
          <div className="playlist-tracks__empty">
            <p>This playlist is empty.</p>
            <p>All tracks have been removed.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaylistDetail;
