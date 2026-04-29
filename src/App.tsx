const highlights = [
  { label: 'Live daily shows', value: '18+' },
  { label: 'Hours streamed every week', value: '120' },
  { label: 'Countries listening', value: '9' },
];

const showBlocks = [
  {
    name: 'Sunrise Pulse',
    time: '06:00 - 09:00',
    desc: 'Warm melodies, weather, and local voices to start your morning.',
  },
  {
    name: 'City Rhythm',
    time: '12:00 - 15:00',
    desc: 'Midday Tamil and international hits with listener requests.',
  },
  {
    name: 'Night Drive',
    time: '20:00 - 23:00',
    desc: 'Late-evening calm, stories, and acoustic tracks for long rides.',
  },
];

function App() {
  return (
    <div className="site-wrap">
      <header className="site-hero">
        <nav className="site-nav">
          <p className="site-logo">OSAI RADIO</p>
          <div className="site-links">
            <a href="#shows">Shows</a>
            <a href="#about">About</a>
            <a href="/?listener=true" className="site-link-pill">
              Listen live
            </a>
          </div>
        </nav>

        <div className="site-hero-grid">
          <div className="site-copy">
            <p className="site-kicker">Digital Tamil FM</p>
            <h1>One station. One live stream. Anywhere.</h1>
            <p>
              OSAI is your online FM experience with real-time broadcasting. Open the listener
              mode to join the live stream, or use the admin panel to run your station.
            </p>
            <div className="site-cta-row">
              <a href="/?listener=true" className="site-cta-primary">
                Open Listener
              </a>
              <a href="/admin" className="site-cta-secondary">
                Open Admin Studio
              </a>
            </div>
          </div>

          <div className="site-stage-card">
            <p>NOW ON AIR</p>
            <h2>City Rhythm</h2>
            <span>Hosted by RJ Nila</span>
            <div className="site-pulse" aria-hidden="true" />
          </div>
        </div>
      </header>

      <main className="site-main">
        <section className="site-stats" aria-label="Station highlights">
          {highlights.map((item) => (
            <article className="site-stat" key={item.label}>
              <strong>{item.value}</strong>
              <p>{item.label}</p>
            </article>
          ))}
        </section>

        <section className="site-shows" id="shows">
          <div>
            <p className="site-kicker">Daily lineup</p>
            <h2>Programs designed for every mood</h2>
          </div>
          <div className="site-show-grid">
            {showBlocks.map((show) => (
              <article className="site-show-card" key={show.name}>
                <p>{show.time}</p>
                <h3>{show.name}</h3>
                <span>{show.desc}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="site-about" id="about">
          <div>
            <p className="site-kicker">About the station</p>
            <h2>Built for live radio teams and community listeners</h2>
            <p>
              Your studio can upload tracks, schedule playback, and broadcast in sync to all
              listeners. This website is connected to the same real-time system powering your
              admin and listener routes.
            </p>
          </div>
          <a href="/?listener=true" className="site-cta-primary">
            Start listening now
          </a>
        </section>
      </main>
    </div>
  );
}

export default App;
