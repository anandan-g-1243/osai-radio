import { useEffect, useRef, useState } from 'react';
import { ref as dbRef, onValue, set } from 'firebase/database';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, firebaseConfigError, storage } from './firebase';

interface Song {
  id: string;
  title: string;
  artist: string;
  url: string;
}

interface BroadcastState {
  isPlaying: boolean;
  songUrl: string;
  songTitle: string;
  songArtist: string;
  startedAt: number;
  seekPosition: number;
}

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? 'admin123';
const BROADCAST_PATH = 'broadcast';
const PLAYLIST_PATH = 'adminPlaylist';

export function AdminApp() {
  const [authed, setAuthed] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [volume, setVolume] = useState(0.8);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  if (firebaseConfigError || !db || !storage) {
    return (
      <div className="admin-login">
        <div className="admin-login-card">
          <h1>🎙️ ஓசை வானொலி</h1>
          <p>Admin is unavailable</p>
          <p className="admin-error">
            {firebaseConfigError ?? 'Firebase services are not configured correctly.'}
          </p>
          <p className="admin-hint">Add all Vercel environment variables, then redeploy.</p>
        </div>
      </div>
    );
  }

  const dbClient = db;
  const storageClient = storage;

  // Load playlist from Firebase
  useEffect(() => {
    if (!authed) return;
    const unsubscribe = onValue(dbRef(dbClient, PLAYLIST_PATH), (snapshot) => {
      const data = snapshot.val() as Record<string, Song> | null;
      if (data) {
        setPlaylist(Object.values(data));
      } else {
        setPlaylist([]);
      }
    });
    return () => unsubscribe();
  }, [authed]);

  // Sync broadcast state from Firebase (to show current state)
  useEffect(() => {
    if (!authed) return;
    const unsubscribe = onValue(dbRef(dbClient, BROADCAST_PATH), (snapshot) => {
      const data = snapshot.val() as BroadcastState | null;
      if (data) {
        setIsPlaying(data.isPlaying);
      }
    });
    return () => unsubscribe();
  }, [authed]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const pushBroadcast = async (song: Song, playing: boolean, position: number) => {
    await set(dbRef(dbClient, BROADCAST_PATH), {
      isPlaying: playing,
      songUrl: song.url,
      songTitle: song.title,
      songArtist: song.artist,
      startedAt: Date.now(),
      seekPosition: position,
    } satisfies BroadcastState);
  };

  const uploadSongs = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('audio/')) return;
      const songId = `song_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const fileRef = storageRef(storageClient, `songs/${songId}_${file.name}`);
      const task = uploadBytesResumable(fileRef, file);

      task.on(
        'state_changed',
        (snap) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          setUploadProgress((prev) => ({ ...prev, [file.name]: pct }));
        },
        () => {
          setUploadProgress((prev) => {
            const next = { ...prev };
            delete next[file.name];
            return next;
          });
        },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          const title = file.name.replace(/\.[^/.]+$/, '');
          const newSong: Song = { id: songId, title, artist: 'Admin Upload', url };
          await set(dbRef(dbClient, `${PLAYLIST_PATH}/${songId}`), newSong);
          setUploadProgress((prev) => {
            const next = { ...prev };
            delete next[file.name];
            return next;
          });
        },
      );
    });
  };

  const playSong = async (song: Song) => {
    setCurrentSong(song);
    setIsPlaying(true);
    if (audioRef.current) {
      audioRef.current.src = song.url;
      audioRef.current.load();
      await audioRef.current.play().catch(() => setIsPlaying(false));
    }
    await pushBroadcast(song, true, 0);
  };

  const togglePlay = async () => {
    if (!currentSong || !audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      await pushBroadcast(currentSong, false, audioRef.current.currentTime);
    } else {
      await audioRef.current.play().catch(() => {});
      setIsPlaying(true);
      await pushBroadcast(currentSong, true, audioRef.current.currentTime);
    }
  };

  const handleSeek = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      if (currentSong) {
        await pushBroadcast(currentSong, isPlaying, time);
      }
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setAuthed(true);
      setPasswordError('');
    } else {
      setPasswordError('Wrong password. Try again.');
    }
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!authed) {
    return (
      <div className="admin-login">
        <div className="admin-login-card">
          <h1>🎙️ ஓசை வானொலி</h1>
          <p>Admin Login</p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Enter admin password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              autoFocus
            />
            {passwordError && <p className="admin-error">{passwordError}</p>}
            <button type="submit">Login</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <h1>🎙️ ஓசை வானொலி — Admin Panel</h1>
        <a href="/" className="ghost-button">← Back to Listener</a>
      </header>

      <div className="admin-body">
        {/* Upload Section */}
        <section className="admin-section">
          <h2>Upload Songs</h2>
          <label className="upload-label">
            <input
              type="file"
              accept="audio/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => uploadSongs(e.target.files)}
            />
            Click to upload audio files
          </label>
          {Object.entries(uploadProgress).map(([name, pct]) => (
            <div key={name} className="upload-progress">
              <span>{name}</span>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span>{pct}%</span>
            </div>
          ))}
        </section>

        {/* Playback Control */}
        <section className="admin-section">
          <h2>Now Broadcasting</h2>
          {currentSong ? (
            <div className="admin-now-playing">
              <p className="admin-song-title">{currentSong.title}</p>
              <p className="admin-song-artist">{currentSong.artist}</p>
              <div className="admin-controls">
                <button type="button" className="primary-button" onClick={togglePlay}>
                  {isPlaying ? '⏸ Pause' : '▶ Play'}
                </button>
              </div>
              <div className="time-row">
                <span>{fmt(currentTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.5}
                  value={currentTime}
                  onChange={handleSeek}
                  className="seek-slider"
                />
                <span>{fmt(duration)}</span>
              </div>
              <div className="time-row">
                <span>Vol</span>
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
            </div>
          ) : (
            <p className="admin-hint">Select a song from the playlist below to start broadcasting.</p>
          )}
        </section>

        {/* Playlist */}
        <section className="admin-section">
          <h2>Playlist ({playlist.length} songs)</h2>
          {playlist.length === 0 ? (
            <p className="admin-hint">No songs uploaded yet. Upload audio files above.</p>
          ) : (
            <ul className="admin-playlist">
              {playlist.map((song) => (
                <li
                  key={song.id}
                  className={`admin-playlist-item ${currentSong?.id === song.id ? 'active' : ''}`}
                  onClick={() => playSong(song)}
                >
                  <span className="admin-play-icon">{currentSong?.id === song.id && isPlaying ? '▶' : '○'}</span>
                  <div>
                    <p className="admin-song-title">{song.title}</p>
                    <p className="admin-song-artist">{song.artist}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <audio
        ref={audioRef}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={() => setIsPlaying(false)}
      />
    </div>
  );
}
