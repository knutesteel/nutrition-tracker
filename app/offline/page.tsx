export default function OfflinePage() {
  return (
    <main className="login">
      <div className="brandmark" aria-hidden="true">I</div>
      <div className="login-kicker">Food & Alcohol Tracker</div>
      <h1>Intake</h1>
      <p>You’re offline.</p>
      <div className="card">
        <h2 className="section-title">Connection unavailable</h2>
        <p className="tiny">Reconnect to view or save private intake and BAC data. The app will resume normally when your connection returns.</p>
        <a className="btn full" href="/" style={{display:'block',textAlign:'center',textDecoration:'none'}}>Try Again</a>
      </div>
    </main>
  )
}
