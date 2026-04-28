import { useState } from 'react';
import type { PlayerState, RepeatMode, ShowSlot, Song, Station } from '../types';

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00';
  }

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

interface CartPanelProps {
  station: Station;
  nowPlaying: ShowSlot;
  playerState: PlayerState;
  currentSong: Song | null;
  songs: Song[];
  showUploadView: boolean;
  currentSongIndex: number;
  isShuffleEnabled: boolean;
  repeatMode: RepeatMode;
  currentTime: number;
  duration: number;
  audioRef: React.RefObject<HTMLAudioElement>;
  onTogglePlay: () => void;
  onVolumeChange: (value: number) => void;
  onPreviousSong: () => void;
  onNextSong: () => void;
  onSelectSong: (index: number) => void;
  onToggleShuffle: () => void;
  onCycleRepeatMode: () => void;
  onSeek: (timeInSeconds: number) => void;
  onUploadSongs: (files: FileList | null) => void;
  onRemoveSong: (songId: number) => void;
  onClearPlaylist: () => void;
  onNativePlay: () => void;
  onNativePause: () => void;
  onTimeUpdate: () => void;
  onLoadedMetadata: () => void;
  onEnded: () => void;
}

export function CartPanel({
  station,
  nowPlaying,
  playerState,
  currentSong,
  songs,
  showUploadView,
  currentSongIndex,
  isShuffleEnabled,
  repeatMode,
  currentTime,
  duration,
  audioRef,
  onTogglePlay,
  onVolumeChange,
  onPreviousSong,
  onNextSong,
  onSelectSong,
  onToggleShuffle,
  onCycleRepeatMode,
  onSeek,
  onUploadSongs,
  onRemoveSong,
  onClearPlaylist,
  onNativePlay,
  onNativePause,
  onTimeUpdate,
  onLoadedMetadata,
  onEnded,
}: CartPanelProps) {
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingFiles(false);
    onUploadSongs(event.dataTransfer.files);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingFiles(true);
  };

  const handleDragLeave = () => {
    setIsDraggingFiles(false);
  };

  return (
    <aside className="cart-panel">
      <div className="cart-header">
        <p className="eyebrow">Live player</p>
        <h2>{station.name}</h2>
      </div>

      <div className="cart-items">
        <div className="cart-empty">
          <strong>Now playing: {nowPlaying.title}</strong>
          <p>
            with {nowPlaying.host} · {nowPlaying.startTime} - {nowPlaying.endTime}
          </p>
          <p>
            Song: {currentSong ? `${currentSong.title} · ${currentSong.artist}` : 'No track selected'}
          </p>
        </div>

        <div className="player-controls">
          <button type="button" onClick={onTogglePlay} disabled={!currentSong}>
            {playerState.isPlaying ? 'Pause stream' : 'Play stream'}
          </button>

          <div className="track-controls">
            <button type="button" onClick={onPreviousSong}>
              Previous
            </button>
            <button type="button" onClick={onNextSong}>
              Next
            </button>
          </div>

          <div className="mode-controls">
            <button
              type="button"
              className={isShuffleEnabled ? 'mode-button mode-button-active' : 'mode-button'}
              onClick={onToggleShuffle}
            >
              Shuffle {isShuffleEnabled ? 'On' : 'Off'}
            </button>
            <button type="button" className="mode-button" onClick={onCycleRepeatMode}>
              Repeat {repeatMode}
            </button>
          </div>

          <div className="time-row" aria-label="Song progress">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={Math.min(currentTime, duration || 0)}
            onChange={(event) => onSeek(Number(event.target.value))}
            disabled={!duration || !currentSong}
            aria-label="Seek"
          />

          <label htmlFor="volume-slider">
            Volume {(playerState.volume * 100).toFixed(0)}%
          </label>
          <input
            id="volume-slider"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={playerState.volume}
            onChange={(event) => onVolumeChange(Number(event.target.value))}
          />

          <label className="upload-label" htmlFor="song-upload-input">
            Upload songs from computer
          </label>
          <input
            id="song-upload-input"
            className="upload-input"
            type="file"
            accept="audio/*"
            multiple
            onChange={(event) => onUploadSongs(event.target.files)}
          />

          <div
            className={isDraggingFiles ? 'dropzone dropzone-active' : 'dropzone'}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            Drop songs here to add them to playlist
          </div>
        </div>
      </div>

      <div className="cart-total">
        {showUploadView ? (
          <div className="upload-page">
            <h3>Upload Songs</h3>
            <p>Add tracks from your computer to start your playlist again.</p>
            <label className="upload-label" htmlFor="song-upload-input-upload-page">
              Choose songs
            </label>
            <input
              id="song-upload-input-upload-page"
              className="upload-input"
              type="file"
              accept="audio/*"
              multiple
              onChange={(event) => onUploadSongs(event.target.files)}
            />
            <div
              className={isDraggingFiles ? 'dropzone dropzone-active' : 'dropzone'}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              Drop songs here to create your new playlist
            </div>
          </div>
        ) : null}

        <audio
          ref={audioRef}
          controls
          preload="none"
          src={currentSong?.url ?? ''}
          onPlay={onNativePlay}
          onPause={onNativePause}
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onLoadedMetadata}
          onEnded={onEnded}
        >
          Your browser does not support audio playback.
        </audio>

        <div className="playlist-toolbar">
          <p className="playlist-count">Playlist tracks: {songs.length}</p>
          <button
            type="button"
            className="clear-playlist-button"
            onClick={onClearPlaylist}
            disabled={songs.length === 0}
          >
            Clear playlist
          </button>
        </div>

        <div className="playlist-list" role="list" aria-label="Playlist">
          {songs.length === 0 ? (
            <div className="playlist-empty">No tracks yet. Upload songs to start listening.</div>
          ) : (
            songs.map((song, index) => (
              <div
                className={index === currentSongIndex ? 'playlist-row playlist-row-active' : 'playlist-row'}
                key={song.id}
              >
                <button
                  type="button"
                  className={index === currentSongIndex ? 'playlist-item playlist-item-active' : 'playlist-item'}
                  onClick={() => onSelectSong(index)}
                >
                  {song.title} · {song.artist}
                </button>
                <button
                  type="button"
                  className="remove-song-button"
                  onClick={() => onRemoveSong(song.id)}
                  aria-label={`Remove ${song.title}`}
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}