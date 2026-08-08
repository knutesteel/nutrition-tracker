import AppShell from '@/components/AppShell'

export default function Home() {
  return (
    <AppShell>
      <div className="top"><div><div className="eyebrow">Today</div><h1 className="title">Daily Intake</h1></div><span className="pill">Today</span></div>
      <div className="card hero"><div className="sub">Calories</div><div className="big">0</div><div className="sub">of 2,000 daily reference</div><div className="bar"><span style={{ width: '0%' }} /></div></div>
      <div className="grid">
        <div className="card metric"><span className="sub">Alcohol</span><b>0</b><span className="tiny">standard drinks</span></div>
        <div className="card metric"><span className="sub">Highest BAC</span><b>—</b><span className="tiny">no readings</span></div>
      </div>
      <div className="card"><h3 className="section-title">Potential Gaps Today</h3><p className="tiny">Add food or drinks to see your nutritional analysis.</p></div>
      <div className="card"><h3 className="section-title">Today's Intake</h3><p className="tiny">No entries yet.</p></div>
    </AppShell>
  )
}
