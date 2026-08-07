import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = { title:'Intake', description:'Food, nutrition, alcohol and BAC tracker', appleWebApp:{capable:true,statusBarStyle:'default',title:'Intake'} }
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html> }
