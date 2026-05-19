import { useEffect, useRef } from 'react';

export default function useWebSocket(url, onMessage) {
  const wsRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    wsRef.current = new WebSocket(url);

    wsRef.current.onmessage = event => {
      try {
        const msg = JSON.parse(event.data);
        onMessageRef.current(msg);
      } catch (e) {
        console.error('WebSocket parse error:', e);
      }
    };

    wsRef.current.onerror = err => console.error('WebSocket error:', err);

    return () => {
      wsRef.current?.close();
    };
  }, [url]);
}
