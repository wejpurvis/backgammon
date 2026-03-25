import { useState, useEffect } from 'react'
import init from '@engine/backgammon_engine'
import type { GameMode } from './types'
import SetupScreen from './screens/SetupScreen'
import GameScreen from './screens/GameScreen'

interface MatchConfig {
  matchLength: number
  mode: GameMode
}

export default function App() {
  const [wasmReady, setWasmReady] = useState(false)
  const [config, setConfig] = useState<MatchConfig | null>(null)

  useEffect(() => {
    init().then(() => setWasmReady(true))
  }, [])

  if (!wasmReady) {
    return <div style={{ color: '#e8e0d0', fontSize: 18 }}>Loading engine…</div>
  }

  if (config === null) {
    return (
      <SetupScreen
        onStart={(matchLength, mode) => setConfig({ matchLength, mode })}
      />
    )
  }

  return (
    <GameScreen
      matchLength={config.matchLength}
      mode={config.mode}
      onNewGame={() => setConfig(null)}
    />
  )
}
