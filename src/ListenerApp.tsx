import { useEffect, useRef, useState } from 'react';
import { ref as dbRef, onValue } from 'firebase/database';
import { db, firebaseConfigError } from './firebase';

interface BroadcastState {
  isPlaying: boolean;
  songUrl: string;
  songTitle: string;
  songArtist: string;
  startedAt: number;
  seekPosition: number;
}

export function ListenerApp() {
  const [broadcast, setBroadcast] = useState<BroadcastState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [listenerPlaying, setListenerPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [tuned, setTuned] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastSongUrl = useRef('');

  if (firebaseConfigError || !db) {
    return (
      <div className="page-shell listener-shell">
        <main className="listener-main">
          <div className="listener-status-card">
            <div className="on-air-badge off-air">○ OFF AIR</div>
            <p className="admin-error">{firebaseConfigError ?? 'Firebase is not configured.'}</p>
            <p className="listener-hint">Add all environment variables and redeploy.</p>
            <a href="/" className="ghost-button">Back to Home</a>
          </div>
        </main>
      </div>
    );
  }

  const dbClient = db;

  // Subscribe to broadcast state from Firebase
  useEffect(() => {
    const unsubscribe = onValue(dbRef(dbClient, 'broadcast'), (snapshot) => {
      const data = snapshot.val() as BroadcastState | null;
      setIsConnected(true);
      setBroadcast(data);
    });
    return () => unsubscribe();
  }, []);

  // Sync audio when broadcast changes
  useEffect(() => {
    if (!broadcast || !audioRef.current || !tuned) return;

    const audio = audioRef.current;
    audio.volume = volume;

    // New song loaded
    if (broadcast.songUrl !== lastSongUrl.current) {
      lastSongUrl.current = broadcast.songUrl;
      audio.src = broadcast.songUrl;
      audio.load();
    }

    if (broadcast.isPlaying) {
      // Calculate the current position: time elapsed since admin set this state
      const elapsedSeconds = (Date.now() - broadcast.startedAt) / 1000;
      const targetPosition = broadcast.seekPosition + elapsedSeconds;

      audio.currentTime = Math.max(0, targetPosition);
      audio.play().then(() => setListenerPlaying(true)).catch(() => {});
    } else {
      audio.pause();
      audio.currentTime = broadcast.seekPosition;
      setListenerPlaying(false);
    }
  }, [broadcast, tuned]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const tuneIn = () => {
    setTuned(true);
    // Trigger sync immediately
    if (broadcast && audioRef.current) {
      const audio = audioRef.current;
      audio.volume = volume;
      audio.src = broadcast.songUrl;
      audio.load();
      if (broadcast.isPlaying) {
        const elapsedSeconds = (Date.now() - broadcast.startedAt) / 1000;
        audio.currentTime = Math.max(0, broadcast.seekPosition + elapsedSeconds);
        audio.play().then(() => setListenerPlaying(true)).catch(() => {});
      }
    }
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const isOnAir = broadcast?.isPlaying ?? false;

  return (
    <div className="page-shell listener-shell">
      <header className="hero-card">
        <nav className="topbar">
          <div>
            <p className="brand-kicker">ஓசை வானொலி</p>
            <h1>ஓசை வானொலி</h1>
          </div>
          <div className="hero-actions">
            {!tuned ? (
              <button
                type="button"
                className="primary-button"
                onClick={tuneIn}
                disabled={!broadcast?.songUrl}
              >
                {broadcast?.songUrl ? '▶ Tune In' : 'Waiting for broadcast...'}
              </button>
            ) : (
              <button
                type="button"
                className={`primary-button ${listenerPlaying ? 'playing' : ''}`}
                onClick={() => {
                  if (listenerPlaying) {
                    audioRef.current?.pause();
                    setListenerPlaying(false);
                  } else {
                    audioRef.current?.play().then(() => setListenerPlaying(true)).catch(() => {});
                  }
                }}
              >
                {listenerPlaying ? '⏸ Pause' : '▶ Resume'}
              </button>
            )}
            <a href="/admin" className="ghost-button">Admin →</a>
          </div>
        </nav>
      </header>

      <main className="listener-main">
        {/* On Air Status */}
        <div className="listener-status-card">
          <div className={`on-air-badge ${isOnAir ? 'on-air' : 'off-air'}`}>
            {isOnAir ? '● ON AIR' : '○ OFF AIR'}
          </div>

          {broadcast?.songTitle ? (
            <div className="listener-now-playing">
              <div className="listener-disc">
                <span className="disc-icon">{listenerPlaying ? '▶' : '♫'}</span>
              </div>
              <h2 className="listener-song-title">{broadcast.songTitle}</h2>
              <p className="listener-song-artist">{broadcast.songArtist}</p>

              {tuned && (
                <>
                  <div className="time-row">
                    <span>{fmt(currentTime)}</span>
                    <div className="progress-bar-bg listener-progress">
                      <div
                        className="progress-bar-fill"
                        style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
                      />
                    </div>
                    <span>{fmt(duration)}</span>
                  </div>
                  <div className="time-row" style={{ marginTop: '0.5rem' }}>
                    <span>🔊</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="seek-slider"
                    />
                    <span>{Math.round(volume * 100)}%</span>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="listener-waiting">
              <p className="listener-waiting-icon">📻</p>
              <p>
                {isConnected
                  ? 'No broadcast active. Check back soon!'
                  : 'Connecting to ஓசை வானொலி...'}
              </p>
            </div>
          )}
        </div>

        <p className="listener-hint">
          All listeners hear the same live broadcast in real time.
        </p>
      </main>

      <audio
        ref={audioRef}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={() => setListenerPlaying(false)}
      />
    </div>
  );
}
