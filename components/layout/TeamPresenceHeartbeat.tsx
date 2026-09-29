'use client';

// components/layout/TeamPresenceHeartbeat.tsx
// Silent client-side heartbeat component that keeps participant presence updated in real-time
// and marks the team offline when the tab or browser is closed.

import { useEffect } from 'react';

export default function TeamPresenceHeartbeat() {
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const getStoredTeamId = (): string | null => {
      try {
        const stored = localStorage.getItem('codeclash_team_session');
        if (stored) {
          const parsed = JSON.parse(stored);
          return parsed.teamId || parsed.id || null;
        }
      } catch (e) {
        console.warn('Error reading team session:', e);
      }
      return null;
    };

    const teamId = getStoredTeamId();
    if (!teamId) return;

    // Send ping to server
    const sendPing = async () => {
      try {
        await fetch('/api/teams/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamId, action: 'ping' }),
        });
      } catch (e) {
        // Silent catch for network hiccups
      }
    };

    // Send disconnect beacon on window/tab close
    const sendDisconnect = () => {
      try {
        const payload = JSON.stringify({ teamId, action: 'disconnect' });
        if (navigator.sendBeacon) {
          const blob = new Blob([payload], { type: 'application/json' });
          navigator.sendBeacon('/api/teams/heartbeat', blob);
        } else {
          fetch('/api/teams/heartbeat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
          }).catch(() => {});
        }
      } catch (e) {
        // Ignored
      }
    };

    // Initial ping on mount
    sendPing();

    // Heartbeat loop every 10 seconds
    intervalId = setInterval(sendPing, 10000);

    // Event listeners for window/tab close or tab switch
    const handleBeforeUnload = () => {
      sendDisconnect();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendDisconnect();
      } else if (document.visibilityState === 'visible') {
        sendPing();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      sendDisconnect();
    };
  }, []);

  return null;
}
