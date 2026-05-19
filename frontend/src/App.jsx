import { useState, useEffect, useCallback } from 'react';
import useWebSocket from './hooks/useWebSocket';
import ResponseTable from './components/ResponseTable';
import StatsBar from './components/StatsBar';
import AnomalyChart from './components/AnomalyChart';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

export default function App() {
  const [responses, setResponses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/stats`);
      const json = await res.json();
      setStats(json);
    } catch (err) {
      console.error('Stats fetch failed:', err);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/responses?limit=50`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setResponses(json.data);
      setError(null);
    } catch (err) {
      setError('Failed to load history. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
    fetchStats();
  }, [loadHistory, fetchStats]);

  const handleMessage = useCallback(msg => {
    if (msg.type === 'new_response') {
      setResponses(prev => [msg.data, ...prev].slice(0, 50));
      fetchStats();
    }
    // Backend sends 'connected' on every new WS connection.
    // If we're in an error/empty state, use it as a signal to retry the data load.
    if (msg.type === 'connected' && (error || responses.length === 0)) {
      loadHistory();
      fetchStats();
    }
  }, [fetchStats, loadHistory, error, responses.length]);

  useWebSocket(WS_URL, handleMessage);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">HTTP Monitor</h1>
          <p className="text-sm text-gray-500 mt-1">
            Live monitoring of <code className="bg-gray-100 px-1 rounded">httpbin.org/anything</code> — pings every 5 minutes
          </p>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {stats && <StatsBar stats={stats} />}
        {responses.length > 0 && <AnomalyChart responses={responses} />}
        {loading ? (
          <div className="bg-white rounded-lg border p-12 text-center text-gray-500">Loading...</div>
        ) : error ? (
          <div className="bg-white rounded-lg border p-12 text-center text-red-500">{error}</div>
        ) : (
          <ResponseTable responses={responses} />
        )}
      </main>
    </div>
  );
}
