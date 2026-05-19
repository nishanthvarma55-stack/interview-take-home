import React, { useState } from 'react';

function StatusBadge({ code }) {
  const isOk = code >= 200 && code < 300;
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
      isOk ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      {code || 'ERR'}
    </span>
  );
}

export default function ResponseTable({ responses }) {
  const [expanded, setExpanded] = useState(null);

  if (responses.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-12 text-center text-gray-400">
        No data yet — waiting for first ping...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <h2 className="text-lg font-semibold p-4 border-b text-gray-900">Response Log</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Timestamp</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Response Time</th>
              <th className="px-4 py-3 text-left">Anomaly</th>
              <th className="px-4 py-3 text-left">Z-Score</th>
              <th className="px-4 py-3 text-left">Payload</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {responses.map(r => (
              <>
                <tr
                  key={r.id}
                  className={`hover:bg-gray-50 transition-colors ${r.is_anomaly ? 'bg-red-50' : ''}`}
                >
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {new Date(r.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3"><StatusBadge code={r.status_code} /></td>
                  <td className="px-4 py-3 font-mono">{r.response_time_ms}ms</td>
                  <td className="px-4 py-3">
                    {r.is_anomaly
                      ? <span className="text-red-600 font-semibold text-xs">ANOMALY</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-500 text-xs">{r.z_score ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                      className="text-blue-500 hover:text-blue-700 text-xs underline"
                    >
                      {expanded === r.id ? 'Hide' : 'View'}
                    </button>
                  </td>
                </tr>
                {expanded === r.id && (
                  <tr key={`${r.id}-detail`}>
                    <td colSpan={6} className="px-4 py-3 bg-gray-50">
                      <pre className="text-xs overflow-x-auto bg-gray-100 p-3 rounded max-h-48 font-mono">
                        {JSON.stringify(
                          { sent: JSON.parse(r.payload_sent || '{}'), received: JSON.parse(r.response_body || '{}') },
                          null, 2
                        )}
                      </pre>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
