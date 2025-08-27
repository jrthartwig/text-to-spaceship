import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [apiText, setApiText] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function fetchApi() {
      setLoading(true)
      setError(null)
      try {
        // read API base from Vite env (set VITE_API_BASE in Azure App Service or local .env)
        const API_BASE = (import.meta.env.VITE_API_BASE as string)
        const endpoint = `${API_BASE.replace(/\/$/, '')}/api/structure_agent`

        const res = await fetch(endpoint, { signal: controller.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const text = await res.text()
        setApiText(text)
      } catch (err: any) {
        if (err.name !== 'AbortError') setError(err.message || String(err))
      } finally {
        setLoading(false)
      }
    }

    fetchApi()
    return () => controller.abort()
  }, [])

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>

      <div style={{ marginTop: 20 }}>
        <h2>API response</h2>
        {loading && <p>Loading...</p>}
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        {apiText && <pre style={{ whiteSpace: 'pre-wrap', background: '#f6f8fa', padding: 12 }}>{apiText}</pre>}
        {!loading && !error && !apiText && <p>No response yet.</p>}
      </div>

      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
