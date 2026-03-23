import { useState, useEffect } from 'react'
import init from '@engine/backgammon_engine'
import SetupScreen from './screens/SetupScreen'
import GameScreen from './screens/GameScreen'

export default function App() {
  const [wasmReady, setWasmReady] = useState(false)
  const [matchLength, setMatchLength] = useState<number | null>(null)

  useEffect(() => {
    init().then(() => setWasmReady(true))
  }, [])

  if (!wasmReady) {
    return <div style={{ color: '#e8e0d0', fontSize: 18 }}>Loading engine…</div>
  }

  if (matchLength === null) {
    return <SetupScreen onStart={setMatchLength} />
  }

  return <GameScreen matchLength={matchLength} onNewGame={() => setMatchLength(null)} />
}
