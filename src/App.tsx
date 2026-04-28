import { useEffect, useMemo, useRef, useState } from 'react';
import { CartPanel } from './components/CartPanel';
import { CategoryPill } from './components/CategoryPill';
import { ProductCard } from './components/ProductCard';
import { schedule, scheduleFilters, songs as seedSongs, station } from './data/products';
import type { PlayerState, RepeatMode, ScheduleFilter, ShowSlot, Song } from './types';

const PLAYLIST_DB_NAME = 'skylinefm-db';
const PLAYLIST_STORE_NAME = 'playlist-store';
const PLAYLIST_RECORD_KEY = 'playlist';
const LEGACY_PLAYLIST_STORAGE_KEY = 'skylinefm-playlist';

const isValidSong = (value: unknown): value is Song => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<Song>;

  return (
    typeof candidate.id === 'number' &&
    typeof candidate.title === 'string' &&
    typeof candidate.artist === 'string' &&
    typeof candidate.url === 'string'
  );
};

const getLegacyPlaylistFromLocalStorage = (): Song[] => {
  try {
    const raw = window.localStorage.getItem(LEGACY_PLAYLIST_STORAGE_KEY);

    if (!raw) {
      return seedSongs;
    }

    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return seedSongs;
    }

    const sanitized = parsed.filter(isValidSong);

    return sanitized.length > 0 ? sanitized : seedSongs;
  } catch {
    return seedSongs;
  }
};

const openPlaylistDatabase = (): Promise<IDBDatabase | null> =>
  new Promise((resolve) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      resolve(null);
      return;
    }

    const request = window.indexedDB.open(PLAYLIST_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(PLAYLIST_STORE_NAME)) {
        db.createObjectStore(PLAYLIST_STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      resolve(null);
    };
  });

const readPlaylistFromIndexedDb = async (): Promise<Song[] | null> => {
  const db = await openPlaylistDatabase();

  if (!db) {
    return null;
  }

  try {
    const songs = await new Promise<Song[] | null>((resolve) => {
      const transaction = db.transaction(PLAYLIST_STORE_NAME, 'readonly');
      const store = transaction.objectStore(PLAYLIST_STORE_NAME);
      const request = store.get(PLAYLIST_RECORD_KEY);

      request.onsuccess = () => {
        const value = request.result as unknown;

        if (!Array.isArray(value)) {
          resolve(null);
          return;
        }

        const sanitized = value.filter(isValidSong);
        resolve(sanitized.length > 0 ? sanitized : null);
      };

      request.onerror = () => {
        resolve(null);
      };
    });

    return songs;
  } finally {
    db.close();
  }
};

const writePlaylistToIndexedDb = async (playlist: Song[]): Promise<void> => {
  const db = await openPlaylistDatabase();

  if (!db) {
    return;
  }

  try {
    await new Promise<void>((resolve) => {
      const transaction = db.transaction(PLAYLIST_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(PLAYLIST_STORE_NAME);
      store.put(playlist, PLAYLIST_RECORD_KEY);

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        resolve();
      };
    });
  } finally {
    db.close();
  }
};

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(String(reader.result ?? ''));
    };

    reader.onerror = () => {
      reject(new Error(`Failed to read ${file.name}`));
    };

    reader.readAsDataURL(file);
  });

const stats = [
  { value: '24/7', label: 'live audio access online' },
  { value: '12k+', label: 'listeners tuned in this week' },
  { value: '3', label: 'curated daily live segments' },
];

function App() {
  const [activeFilter, setActiveFilter] = useState<ScheduleFilter>('All');
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    volume: 0.75,
  });
  const [playlist, setPlaylist] = useState<Song[]>(seedSongs);
  const [playlistHydrated, setPlaylistHydrated] = useState(false);
  const [showUploadView, setShowUploadView] = useState(false);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isShuffleEnabled, setIsShuffleEnabled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all');
  const [playbackProgress, setPlaybackProgress] = useState({
    currentTime: 0,
    duration: 0,
  });
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentSong: Song | null = playlist[currentSongIndex] ?? playlist[0] ?? null;

  useEffect(() => {
    let isMounted = true;

    const hydratePlaylist = async () => {
      const indexedDbPlaylist = await readPlaylistFromIndexedDb();

      if (!isMounted) {
        return;
      }

      if (indexedDbPlaylist && indexedDbPlaylist.length > 0) {
        setPlaylist(indexedDbPlaylist);
        setPlaylistHydrated(true);
        return;
      }

      const legacyPlaylist = getLegacyPlaylistFromLocalStorage();
      setPlaylist(legacyPlaylist);
      setPlaylistHydrated(true);

      try {
        window.localStorage.removeItem(LEGACY_PLAYLIST_STORAGE_KEY);
      } catch {
        // Ignore local storage cleanup failures.
      }
    };

    void hydratePlaylist();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!playlistHydrated) {
      return;
    }

    void writePlaylistToIndexedDb(playlist);
  }, [playlist, playlistHydrated]);

  useEffect(() => {
    if (playlist.length === 0) {
      setShowUploadView(true);
    }
  }, [playlist.length]);

  const visibleSchedule = useMemo(() => {
    if (activeFilter === 'All') {
      return schedule;
    }

    if (activeFilter === 'Live') {
      return schedule.filter((show) => show.status === 'Live');
    }

    return schedule.filter((show) => show.segment === activeFilter);
  }, [activeFilter]);

  const nowPlaying: ShowSlot = useMemo(
    () => schedule.find((show) => show.status === 'Live') ?? schedule[0],
    [],
  );

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = playerState.volume;
    }
  }, [playerState.volume]);

  useEffect(() => {
    if (!audioRef.current || !currentSong) {
      return;
    }

    audioRef.current.load();

    if (playerState.isPlaying) {
      audioRef.current.play().catch(() => {
        setPlayerState((current) => ({ ...current, isPlaying: false }));
      });
    }
  }, [currentSong, currentSongIndex, playerState.isPlaying]);

  const togglePlay = async () => {
    if (!audioRef.current || !currentSong) {
      return;
    }

    if (playerState.isPlaying) {
      audioRef.current.pause();
      setPlayerState((current) => ({ ...current, isPlaying: false }));
      return;
    }

    try {
      await audioRef.current.play();
      setPlayerState((current) => ({ ...current, isPlaying: true }));
    } catch {
      setPlayerState((current) => ({ ...current, isPlaying: false }));
    }
  };

  const tuneIn = async () => {
    if (!currentSong) {
      return;
    }

    if (!playerState.isPlaying) {
      await togglePlay();
    }
  };

  const setVolume = (volume: number) => {
    setPlayerState((current) => ({ ...current, volume }));
  };

  const getRandomSongIndex = (excludeIndex: number) => {
    if (playlist.length <= 1) {
      return excludeIndex;
    }

    let randomIndex = excludeIndex;

    while (randomIndex === excludeIndex) {
      randomIndex = Math.floor(Math.random() * playlist.length);
    }

    return randomIndex;
  };

  const goToPreviousSong = () => {
    if (playlist.length === 0) {
      return;
    }

    setCurrentSongIndex((current) => {
      if (isShuffleEnabled) {
        return getRandomSongIndex(current);
      }

      return (current - 1 + playlist.length) % playlist.length;
    });
  };

  const goToNextSong = () => {
    if (playlist.length === 0) {
      return;
    }

    setCurrentSongIndex((current) => {
      if (isShuffleEnabled) {
        return getRandomSongIndex(current);
      }

      return (current + 1) % playlist.length;
    });
  };

  const selectSong = (index: number) => {
    if (index < 0 || index >= playlist.length) {
      return;
    }

    setShowUploadView(false);
    setCurrentSongIndex(index);
    setPlaybackProgress({ currentTime: 0, duration: 0 });
    setPlayerState((current) => ({ ...current, isPlaying: true }));
  };

  const toggleShuffle = () => {
    setIsShuffleEnabled((current) => !current);
  };

  const uploadSongs = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    const audioFiles = Array.from(files).filter((file) => file.type.startsWith('audio/'));

    if (audioFiles.length === 0) {
      return;
    }

    const uploadedSongs = await Promise.all(
      audioFiles.map(async (file) => {
        const title = file.name.replace(/\.[^/.]+$/, '') || 'Uploaded Track';

        return {
          title,
          artist: 'Local Upload',
          url: await fileToDataUrl(file),
        };
      }),
    );

    setPlaylist((currentPlaylist) => {
      const startId = currentPlaylist.length === 0
        ? 1
        : Math.max(...currentPlaylist.map((song) => song.id)) + 1;

      const withIds: Song[] = uploadedSongs.map((song, index) => ({
        ...song,
        id: startId + index,
      }));

      return [...currentPlaylist, ...withIds];
    });

    setShowUploadView(false);
  };

  const removeSong = (songId: number) => {
    setPlaylist((currentPlaylist) => {
      const removedIndex = currentPlaylist.findIndex((song) => song.id === songId);

      if (removedIndex === -1) {
        return currentPlaylist;
      }

      const nextPlaylist = currentPlaylist.filter((song) => song.id !== songId);

      setCurrentSongIndex((currentIndex) => {
        if (nextPlaylist.length === 0) {
          return 0;
        }

        if (currentIndex > removedIndex) {
          return currentIndex - 1;
        }

        if (currentIndex === removedIndex) {
          return Math.min(currentIndex, nextPlaylist.length - 1);
        }

        return currentIndex;
      });

      if (nextPlaylist.length === 0 && audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setPlayerState((current) => ({ ...current, isPlaying: false }));
        setPlaybackProgress({ currentTime: 0, duration: 0 });
      }

      return nextPlaylist;
    });
  };

  const clearPlaylist = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setPlaylist([]);
    setShowUploadView(true);
    setCurrentSongIndex(0);
    setPlayerState((current) => ({ ...current, isPlaying: false }));
    setPlaybackProgress({ currentTime: 0, duration: 0 });
  };

  const cycleRepeatMode = () => {
    setRepeatMode((current) => {
      if (current === 'off') {
        return 'all';
      }

      if (current === 'all') {
        return 'one';
      }

      return 'off';
    });
  };

  const updateTimeProgress = () => {
    if (!audioRef.current) {
      return;
    }

    const safeDuration = Number.isFinite(audioRef.current.duration) ? audioRef.current.duration : 0;

    setPlaybackProgress({
      currentTime: audioRef.current.currentTime,
      duration: safeDuration,
    });
  };

  const seekToTime = (timeInSeconds: number) => {
    if (!audioRef.current) {
      return;
    }

    audioRef.current.currentTime = timeInSeconds;
    setPlaybackProgress((current) => ({
      ...current,
      currentTime: timeInSeconds,
    }));
  };

  const syncPlay = () => {
    setPlayerState((current) => ({ ...current, isPlaying: true }));
  };

  const syncPause = () => {
    setPlayerState((current) => ({ ...current, isPlaying: false }));
  };

  const handleSongEnded = () => {
    if (playlist.length === 0) {
      setPlayerState((current) => ({ ...current, isPlaying: false }));
      return;
    }

    if (repeatMode === 'one' && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        setPlayerState((current) => ({ ...current, isPlaying: false }));
      });
      return;
    }

    const isLastSong = currentSongIndex === playlist.length - 1;

    if (!isShuffleEnabled && repeatMode === 'off' && isLastSong) {
      setPlayerState((current) => ({ ...current, isPlaying: false }));
      return;
    }

    setPlayerState((current) => ({ ...current, isPlaying: true }));

    if (isShuffleEnabled) {
      setCurrentSongIndex((current) => getRandomSongIndex(current));
      return;
    }

    if (isLastSong) {
      setCurrentSongIndex(0);
      return;
    }

    setCurrentSongIndex((current) => current + 1);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isTypingTarget =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (isTypingTarget) {
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();
        void togglePlay();
        return;
      }

      if (event.code === 'ArrowRight') {
        event.preventDefault();
        const nextTime = Math.min(playbackProgress.currentTime + 10, playbackProgress.duration || 0);
        seekToTime(nextTime);
        return;
      }

      if (event.code === 'ArrowLeft') {
        event.preventDefault();
        const nextTime = Math.max(playbackProgress.currentTime - 10, 0);
        seekToTime(nextTime);
        return;
      }

      if (event.code === 'KeyN') {
        event.preventDefault();
        goToNextSong();
        return;
      }

      if (event.code === 'KeyP') {
        event.preventDefault();
        goToPreviousSong();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    goToNextSong,
    goToPreviousSong,
    playbackProgress.currentTime,
    playbackProgress.duration,
    seekToTime,
    togglePlay,
  ]);

  return (
    <div className="page-shell">
      <header className="hero-card">
        <nav className="topbar">
          <div>
            <p className="brand-kicker">SKYLINE FM</p>
            <h1>Live online FM vibes for every part of your day.</h1>
          </div>
          <div className="hero-actions">
            <button type="button" className="primary-button" onClick={tuneIn}>
              Tune now
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => setActiveFilter('Live')}
            >
              View live show
            </button>
          </div>
        </nav>

        <section className="hero-grid">
          <div className="hero-copy">
            <p>
              Stream Skyline FM directly in your browser with a clean player panel,
              live-program preview, and simple schedule filtering.
            </p>
            <div className="stat-grid">
              {stats.map((stat) => (
                <div className="stat-card" key={stat.label}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-highlight">
            <p className="eyebrow">Current broadcast</p>
            <h2>{nowPlaying.title}</h2>
            <p>
              Hosted by {nowPlaying.host} from {nowPlaying.startTime} to {nowPlaying.endTime}.
              {` `}
              {nowPlaying.summary}
            </p>
          </div>
        </section>
      </header>

      <main className="content-grid">
        <section className="catalog-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Station profile</p>
              <h2>Stay tuned from {station.location} on {station.frequency}.</h2>
            </div>
            <div className="pill-row">
              {scheduleFilters.map((filter) => (
                <CategoryPill
                  key={filter}
                  label={filter}
                  active={filter === activeFilter}
                  onClick={() => setActiveFilter(filter)}
                />
              ))}
            </div>
          </div>

          <div className="product-grid">
            <ProductCard station={station} isPlaying={playerState.isPlaying} onTune={tuneIn} />
          </div>

          <div className="schedule-list">
            {visibleSchedule.length === 0 ? (
              <div className="schedule-item">
                <strong>No shows in this filter.</strong>
                <p>Switch to another filter to see upcoming programs.</p>
              </div>
            ) : (
              visibleSchedule.map((show) => (
                <article className="schedule-item" key={show.id}>
                  <div>
                    <p className="eyebrow">{show.status}</p>
                    <h3>{show.title}</h3>
                  </div>
                  <p>
                    {show.host} · {show.startTime} - {show.endTime}
                  </p>
                  <p>{show.summary}</p>
                </article>
              ))
            )}
          </div>
        </section>

        <CartPanel
          station={station}
          nowPlaying={nowPlaying}
          playerState={playerState}
          currentSong={currentSong}
          songs={playlist}
          showUploadView={showUploadView}
          currentSongIndex={currentSongIndex}
          isShuffleEnabled={isShuffleEnabled}
          repeatMode={repeatMode}
          currentTime={playbackProgress.currentTime}
          duration={playbackProgress.duration}
          audioRef={audioRef}
          onTogglePlay={togglePlay}
          onVolumeChange={setVolume}
          onPreviousSong={goToPreviousSong}
          onNextSong={goToNextSong}
          onSelectSong={selectSong}
          onToggleShuffle={toggleShuffle}
          onCycleRepeatMode={cycleRepeatMode}
          onSeek={seekToTime}
          onUploadSongs={uploadSongs}
          onRemoveSong={removeSong}
          onClearPlaylist={clearPlaylist}
          onNativePlay={syncPlay}
          onNativePause={syncPause}
          onTimeUpdate={updateTimeProgress}
          onLoadedMetadata={updateTimeProgress}
          onEnded={handleSongEnded}
        />
      </main>
    </div>
  );
}

export default App;