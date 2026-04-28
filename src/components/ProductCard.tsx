import type { Station } from '../types';

interface ProductCardProps {
  station: Station;
  isPlaying: boolean;
  onTune: () => void;
}

export function ProductCard({ station, isPlaying, onTune }: ProductCardProps) {
  return (
    <article className="product-card">
      <div className="product-visual" style={{ background: station.accent }}>
        <span>{station.frequency}</span>
      </div>
      <div className="product-copy">
        <div className="product-head">
          <div>
            <p className="eyebrow">{station.name}</p>
            <h3>{station.tagline}</h3>
          </div>
          <strong>{station.genre}</strong>
        </div>
        <div className="product-meta">
          <span>{station.listeners.toLocaleString()} listeners now</span>
          <button type="button" onClick={onTune}>
            {isPlaying ? 'Listening live' : 'Tune in'}
          </button>
        </div>
      </div>
    </article>
  );
}