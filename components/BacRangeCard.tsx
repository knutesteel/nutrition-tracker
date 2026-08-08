import {getBacWarning} from '@/lib/bac'

type Reading = {bac:number|string;measured_at:string}

export default function BacRangeCard({readings}:{readings:Reading[]}) {
  if (!readings.length) return <div className="card bac-range-card"><h3 className="section-title">Today&apos;s BAC</h3><p className="tiny">No readings recorded today.</p></div>
  const values = readings.map(r=>Number(r.bac)).filter(Number.isFinite)
  const low = Math.min(...values)
  const high = Math.max(...values)
  const currentReading = [...readings].sort((a,b)=>new Date(b.measured_at).getTime()-new Date(a.measured_at).getTime())[0]
  const current = Number(currentReading.bac)
  const scaleMax = Math.max(.2, Math.ceil(high/.05)*.05)
  const position = (value:number) => `${Math.min(100,Math.max(0,value/scaleMax*100))}%`
  const warning = getBacWarning(current)
  return <div className="card bac-range-card">
    <div className="bac-range-heading"><h3 className="section-title">Today&apos;s BAC</h3><span className="tiny">{values.length} reading{values.length===1?'':'s'}</span></div>
    <div className="bac-values" aria-label={`Low ${low.toFixed(3)}, high ${high.toFixed(3)}, current ${current.toFixed(3)}`}><div><span>Low</span><b>{low.toFixed(3)}</b></div><div><span>High</span><b>{high.toFixed(3)}</b></div><div><span>Current</span><b>{current.toFixed(3)}</b></div></div>
    <div className="bac-scale" aria-hidden="true"><div className="bac-track"/><div className="bac-range-fill" style={{left:position(low),width:`${Math.max(1,(high-low)/scaleMax*100)}%`}}/><span className="bac-tick" style={{left:position(low)}}/><span className="bac-tick" style={{left:position(high)}}/><span className="bac-current" style={{left:position(current)}}/></div>
    <div className="bac-scale-labels"><span>0.000</span><span>{scaleMax.toFixed(3)}</span></div>
    {warning&&<div className={`bac-alert ${warning.level}`} role="alert"><b>{warning.title}</b><span>{warning.message}</span></div>}
    <p className="micro">BAC readings are for tracking only. Never use a reading or a legal limit to decide whether it is safe to drive.</p>
  </div>
}
