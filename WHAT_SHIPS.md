# WHAT_SHIPS

Snapshot of what the **main** branch actually does. Update every agent run.

## Works today

- Password register/login, JWT, profile GET/PUT
- Change password from Settings
- Song list, upload, signed progressive stream for `<audio>` (server + musicService intact)
- **Full PlayerContext restored (dose-1.112)**: loadSong race guard, queue, Fisher–Yates shuffle, hydrate/persist, media session, keyboard N/P, clearQueue (incl. Media Session null metadata + playbackState none), seek clamps
- MusicPlayer a11y through dose-1.110
- Playlists, rooms, AI fallbacks, Olympus flags honesty
- Docs honesty, soft logout, room host/presence, genre filter, Settings status

## Does not ship (honest)

- OAuth, HLS in the React player, WebRTC video product, Demucs stems, pitch-shift DSP
- Full multi-device live queue sync over sockets
- Server-persisted multi-track queue
- Telemetry/loudness/waveform
- Redis-backed multi-instance room presence

## Next item

Dose 2 leftovers (profile polish if any) or Dose 4 room host song picker / honest listener counts verification. No Dose 6+.
