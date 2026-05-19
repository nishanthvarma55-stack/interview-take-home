import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';

function AnomalyDot(props) {
  const { cx, cy, payload } = props;
  if (!payload) return null;
  if (payload.is_anomaly) {
    return <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#fff" strokeWidth={2} />;
  }
  return <circle cx={cx} cy={cy} r={3} fill="#3b82f6" />;
}

export default function AnomalyChart({ responses }) {
  const data = [...responses].reverse().map(r => ({
    time: new Date(r.timestamp).toLocaleTimeString(),
    responseTime: r.response_time_ms,
    is_anomaly: r.is_anomaly === 1
  }));

  return (
    <div className="bg-white rounded-lg border p-4">
      <h2 className="text-lg font-semibold mb-4 text-gray-900">Response Time History</h2>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis unit="ms" tick={{ fontSize: 11 }} width={60} />
          <Tooltip formatter={v => [`${v}ms`, 'Response Time']} />
          <Line
            type="monotone"
            dataKey="responseTime"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={<AnomalyDot />}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex gap-6 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-blue-500" />
          Normal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
          Anomaly (z-score &gt; 2σ)
        </span>
      </div>
    </div>
  );
}
