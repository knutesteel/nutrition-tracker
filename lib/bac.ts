export type BacWarning = {
  level: 'caution' | 'warning' | 'danger' | 'emergency'
  title: string
  message: string
}

export function getBacWarning(value: number | null | undefined): BacWarning | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null
  if (value >= 0.3) return { level:'emergency', title:'Possible alcohol poisoning', message:'A BAC at this level can be life-threatening. Call 911 now. Do not leave the person alone.' }
  if (value >= 0.15) return { level:'danger', title:'Dangerously high BAC', message:'Confusion, vomiting, drowsiness, and loss of balance can occur. Stay with a sober adult. Call 911 for trouble breathing, inability to wake, seizure, or repeated vomiting.' }
  if (value >= 0.08) return { level:'danger', title:'Significant impairment', message:'Coordination, judgment, and reaction time are impaired. Do not drive or operate machinery. Arrange a sober ride and remain with someone you trust.' }
  if (value >= 0.05) return { level:'warning', title:'Impairment is likely', message:'Alertness, judgment, and coordination may be reduced. Do not drive or operate machinery.' }
  return { level:'caution', title:'Alcohol detected', message:'Impairment can begin below legal limits. Do not use this reading to decide whether it is safe to drive.' }
}
