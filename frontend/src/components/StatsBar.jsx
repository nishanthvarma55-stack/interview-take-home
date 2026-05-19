import React from 'react';

export default function StatsBar({ stats }) {
  const cards = [
    { label: 'Total Pings', value: stats.total },
    { label: 'Avg Response', value: stats.avg_response_time ? `${Math.round(stats.avg_response_time)}ms` : '—' },
    { label: 'Min', value: stats.min_response_time != null ? `${stats.min_response_time}ms` : '—' },
    { label: 'Max', value: stats.max_response_time != null ? `${stats.max_response_time}ms` : '—' },
    { label: 'Anomalies', value: stats.anomaly_count, highlight: stats.anomaly_count > 0 },
    { label: 'Predicted Next', value: stats.predicted_next_response_time ? `~${stats.predicted_next_response_time}ms` : '—' }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map(card => (
        <div
          key={card.label}
          className={`bg-white rounded-lg border p-4 ${card.highlight ? 'border-red-300 bg-red-50' : ''}`}
        >
          <p className="text-xs text-gray-500">{card.label}</p>
          <p className={`text-2xl font-bold mt-1 ${card.highlight ? 'text-red-600' : 'text-gray-900'}`}>
            {card.value ?? '—'}
          </p>
        </div>
      ))}
    </div>
  );
}
