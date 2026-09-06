# WHAT_SHIPS

Snapshot of what the **main** branch actually does. Update every agent run.

## INCIDENT (2026-09-06)

PlayerContext.js on main was accidentally emptied then partially restored during dose-1.111 push. **Current PlayerContext is truncated stubs and will break playback.** Next agent must restore full content from commit `93ef61b7` (blob `f93b4cef9ed25b8f29f689c84b71557d98e68808`) and re-apply the clearQueue Media Session clear (null metadata + playbackState none).

WHAT_SHIPS itself was restored. Do not start Dose 6+.

## Works today (pre-incident, once PlayerContext restored)

- Password register/login, JWT, profile GET/PUT
- Change password from Settings
- Song list, upload, signed progressive stream for `<audio>` (server + musicService intact)
- Full PlayerContext (dose-1.103+): loadSong race guard, queue, Fisher–Yates shuffle, hydrate/persist, media session, keyboard N/P, clearQueue, seek clamps
- MusicPlayer a11y through dose-1.110
- **clearQueue clears Media Session (dose-1.111 intent)**: null metadata + playbackState none
- Playlists, rooms, AI fallbacks, Olympus flags honesty
- Docs honesty, soft logout, room host/presence, genre filter, Settings status

## Does not ship (honest)

- OAuth, HLS in the React player, WebRTC video product, Demucs stems, pitch-shift DSP
- Full multi-device live queue sync over sockets
- Server-persisted multi-track queue
- Telemetry/loudness/waveform
- Redis-backed multi-instance room presence

## Next item

**Restore PlayerContext.js full file from `93ef61b7` + dose-1.111 Media Session clear on clearQueue.** Then Dose 2/4 leftovers. No Dose 6+.
