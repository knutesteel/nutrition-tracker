import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Intake — Food & Alcohol Tracker',
    short_name: 'Intake',
    description: 'Track food, nutrition, alcohol intake and BAC readings.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f5f7f6',
    theme_color: '#0b3d2e',
    categories: ['health', 'lifestyle'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Add Intake', short_name: 'Add', url: '/?add=1', icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }] },
      { name: 'History', short_name: 'History', url: '/history', icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }] },
    ],
  }
}
