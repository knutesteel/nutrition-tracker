import { redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'
import BacCard from '@/components/BacCard'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const start = new Date(); start.setHours(0,0,0,0)
  const end = new Date(start); end.setDate(end.getDate()+1)
  const [{data:entries}, {data:readings}, {data:reminders}] = await Promise.all([
    supabase.from('intake_entries').select('id,description,portion,consumed_at,entry_type,nutrition_analyses(calories,protein_g,carbs_g,fat_g,fiber_g,sodium_mg,potassium_mg,calcium_mg,iron_mg,magnesium_mg,vitamin_c_pct,vitamin_d_pct),alcohol_analyses(standard_drinks)').gte('consumed_at',start.toISOString()).lt('consumed_at',end.toISOString()).order('consumed_at',{ascending:false}),
    supabase.from('bac_readings').select('bac,measured_at').gte('measured_at',start.toISOString()).lt('measured_at',end.toISOString()).order('bac',{ascending:false}),
    supabase.from('bac_reminders').select('id,related_entry_id,next_reminder_at,status').eq('status','active').order('next_reminder_at',{ascending:true})
  ])
  const rows = entries || []
  const calories = Math.round(rows.reduce((sum,e)=>sum+Number((e.nutrition_analyses as any)?.[0]?.calories||0),0))
  const drinks = rows.reduce((sum,e)=>sum+Number((e.alcohol_analyses as any)?.[0]?.standard_drinks||0),0)
  const highest = readings?.[0]?.bac
  const totals = rows.reduce((a,e)=>{const n=(e.nutrition_analyses as any)?.[0]||{}; for(const k of Object.keys(a)) a[k]+=Number(n[k]||0); return a},{protein_g:0,carbs_g:0,fat_g:0,fiber_g:0,sodium_mg:0,potassium_mg:0,calcium_mg:0,iron_mg:0,magnesium_mg:0,vitamin_c_pct:0,vitamin_d_pct:0} as Record<string,number>)
  const gaps = [
    ['Fiber',totals.fiber_g,28,'g'],['Potassium',totals.potassium_mg,4700,'mg'],['Calcium',totals.calcium_mg,1300,'mg'],['Iron',totals.iron_mg,18,'mg'],['Magnesium',totals.magnesium_mg,420,'mg'],['Vitamin C',totals.vitamin_c_pct,100,'%'],['Vitamin D',totals.vitamin_d_pct,100,'%']
  ].filter(([,v,t])=>Number(v)<Number(t)*.5).slice(0,4)
  return <AppShell>
    <div className="top"><div><div className="eyebrow">Today</div><h1 className="title">Daily Intake</h1></div><span className="pill">{new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span></div>
    <div className="card hero"><div className="sub">Calories</div><div className="big">{calories.toLocaleString()}</div><div className="sub">of 2,000 daily reference</div><div className="bar"><span style={{width:`${Math.min(100,calories/20)}%`}} /></div></div>
    <div className="grid"><div className="card metric"><span className="sub">Alcohol</span><b>{drinks.toFixed(drinks%1?1:0)}</b><span className="tiny">standard drinks</span></div><div className="card metric"><span className="sub">Highest BAC</span><b>{highest==null?'—':Number(highest).toFixed(3)}</b><span className="tiny">{highest==null?'no readings':'measured'}</span></div></div>
    <BacCard reminders={reminders||[]} />
    <div className="card"><h3 className="section-title">Potential Gaps Today</h3>{rows.length===0?<p className="tiny">Add food or drinks to see your nutritional analysis.</p>:gaps.length===0?<p className="tiny">No major gaps detected from today’s analyzed entries.</p>:gaps.map(([name,value,target,unit])=><div className="row" key={String(name)}><span>{name}</span><span className="tiny">{Math.round(Number(value))}{unit} / {target}{unit}</span></div>)}</div>
    <div className="card"><h3 className="section-title">Today's Intake</h3>{rows.length===0?<p className="tiny">No entries yet. Tap + to add one.</p>:rows.map(e=><div className="entry" key={e.id}><div><b>{e.description}</b><div className="tiny">{e.portion} · {new Date(e.consumed_at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</div></div><span>{Math.round(Number((e.nutrition_analyses as any)?.[0]?.calories||0))} cal</span></div>)}</div>
  </AppShell>
}
