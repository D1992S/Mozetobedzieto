import { useAppStore } from './store/index.ts';

export function App() {
  const initialized = useAppStore((s) => s.initialized);

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Mozetobedzieto</h1>
      <p>AI-first analytics machine for YouTube creators</p>
      <p>Status: {initialized ? 'Ready' : 'Initializing...'}</p>
    </main>
  );
}
