'use client'
import Link from 'next/link'
import { useState } from 'react'
import IntakeSheet from './IntakeSheet'
export default function AppShell({children}:{children:React.ReactNode}){ const [open,setOpen]=useState(false); return <><div className="shell">{children}</div><div className="nav"><div className="nav-inner"><Link href="/">Today</Link><Link href="/history">History</Link><button className="plus" onClick={()=>setOpen(true)}>+</button><Link href="/trends">Trends</Link><Link href="/settings">Settings</Link></div></div>{open&&<IntakeSheet onClose={()=>setOpen(false)}/>}</> }
