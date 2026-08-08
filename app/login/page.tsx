'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Login() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function signInWithGoogle() {
    setBusy(true)
    setMessage('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/confirm`,
      },
    })

    if (error) {
      setMessage(error.message)
      setBusy(false)
    }
  }

  return (
    <main className="login">
      <div className="brandmark">↗</div>
      <div className="login-kicker">Nutrition · Alcohol · BAC</div>
      <h1>INTAKE</h1>
      <p>Track food, alcohol, nutrition, and BAC in one private place.</p>
      <div className="form">
        <button className="btn" type="button" disabled={busy} onClick={signInWithGoogle}>
          {busy ? 'Opening Google…' : 'Continue with Google'}
        </button>
        {message && <p className="tiny">{message}</p>}
      </div>
      <p className="micro">Your entries are private and only visible to your signed-in account.</p>
    </main>
  )
}
