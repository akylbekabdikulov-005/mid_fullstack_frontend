import { useEffect, useState } from 'react';

export default function useWebSocket(token, onMessage) {
  const [status, setStatus] = useState('disconnected');

  useEffect(() => {
    if (!token) {
      setStatus('disconnected');
      return;
    }

    const url = `${import.meta.env.VITE_WS_URL || 'ws://localhost:5000'}/ws`;
    const socket = new WebSocket(url, token);

    socket.onopen = () => setStatus('connected');
    socket.onclose = () => setStatus('disconnected');
    socket.onerror = () => setStatus('error');
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (err) {
        console.error('Invalid WebSocket message', err);
      }
    };

    return () => {
      socket.close();
    };
  }, [token, onMessage]);

  return status;
}
