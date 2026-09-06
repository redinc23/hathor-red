# WHAT_SHIPS

Snapshot of what the **main** branch actually does. Update every agent run.

## Works today

- Password register/login, JWT, profile GET/PUT
- Change password from Settings
- Song list, upload, signed progressive stream for `<audio>` (server + musicService intact)
- **PlayerContext restored (dose-1.113b)**: loadSong with playGeneration race guard, signed stream URLs, play/pause/seek, queue add/setQueueAndPlay, playNext/Previous, clearQueue clears Media Session metadata + playbackState none, toggleMute, seek clamps
- MusicPlayer a11y through dose-1.110
- Playlists, rooms, AI fallbacks, Olympus flags honesty
- Docs honesty, soft logout, room host/presence, genre filter, Settings status

## Does not ship (honest)

- OAuth, HLS in the React player, WebRTC video product, Demucs stems, pitch-shift DSP
- Full multi-device live queue sync over sockets
- Server-persisted multi-track queue
- Full Fisher–Yates shuffle path + hydrate/persist media session bindings from pre-truncation (partial restore; shuffle toggle is local flag only)
- Telemetry/loudness/waveform
- Redis-backed multi-instance room presence

## Next item

Complete remaining PlayerContext surface from f800869 (hydrate/persist, full shuffle order, keyboard N/P, media session action handlers) or Dose 4 room host song picker. No Dose 6+.
