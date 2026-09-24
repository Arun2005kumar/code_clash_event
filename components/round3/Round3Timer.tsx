'use client';

// components/round3/Round3Timer.tsx — Persistent, real-time Round 3 countdown timer
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const TOTAL_ROUND3_SECONDS = 1500; // 25 minutes global round time

interface Round3TimerProps {
  teamId: string;
  className?: string;
  onExpire?: () => void;
}

export default function Round3Timer({ teamId, className = '', onExpire }: Round3TimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(TOTAL_ROUND3_SECONDS);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [finishTime, setFinishTime] = useState<number | null>(null);

  useEffect(() => {
    if (!teamId) return;

    const supabase = createClient();
    const fetchState = async () => {
      const { data } = await supabase
        .from('round3_team_state')
        .select('started_at, completed_at, finish_time_seconds')
        .eq('team_id', teamId)
        .maybeSingle();

      if (data) {
        setStartedAt(data.started_at);
        setCompletedAt(data.completed_at);
        setFinishTime(data.finish_time_seconds);
      }
    };

    fetchState();

    const channel = supabase
      .channel(`round3-timer-${teamId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'round3_team_state',
        filter: `team_id=eq.${teamId}`,
      }, (payload: any) => {
        if (payload.new) {
          setStartedAt(payload.new.started_at);
          setCompletedAt(payload.new.completed_at);
          setFinishTime(payload.new.finish_time_seconds);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId]);

  useEffect(() => {
    if (completedAt && finishTime !== null) {
      const left = Math.max(0, TOTAL_ROUND3_SECONDS - finishTime);
      setRemainingSeconds(left);
      return;
    }

    if (!startedAt) return;
    const startMs = new Date(startedAt).getTime();

    const updateRemaining = () => {
      const elapsedSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      const leftSec = Math.max(0, TOTAL_ROUND3_SECONDS - elapsedSec);
      setRemainingSeconds(leftSec);

      if (leftSec === 0 && onExpire) {
        onExpire();
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);

    return () => clearInterval(interval);
  }, [startedAt, completedAt, finishTime, onExpire]);

  const isExpired = remainingSeconds <= 0;
  const isHighUrgency = remainingSeconds > 0 && remainingSeconds <= 60;
  const isWarning = remainingSeconds > 60 && remainingSeconds <= 300;

  const mins = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
  const secs = String(remainingSeconds % 60).padStart(2, '0');

  // Styling based on state
  let containerStyle = 'bg-surface-card text-ink-primary border-2 border-ink-primary shadow-[3px_3px_0px_#0F172A]';
  let labelStyle = 'text-round-3-purple';
  let digitsStyle = 'text-ink-primary';
  let statusText = 'TIME REMAINING';

  if (isExpired) {
    containerStyle = 'bg-status-wrong text-white border-2 border-ink-primary shadow-[3px_3px_0px_#0F172A] animate-pulse';
    labelStyle = 'text-white font-black';
    digitsStyle = 'text-white font-black';
    statusText = 'TIME EXPIRED';
  } else if (isHighUrgency) {
    containerStyle = 'bg-status-wrong text-white border-2 border-ink-primary shadow-[3px_3px_0px_#0F172A] animate-pulse';
    labelStyle = 'text-yellow-300 font-black';
    digitsStyle = 'text-yellow-300 font-black';
    statusText = 'TIME REMAINING';
  } else if (isWarning) {
    containerStyle = 'bg-canvas-cream text-ink-primary border-2 border-round-2-amber shadow-[3px_3px_0px_#0F172A]';
    labelStyle = 'text-round-2-orange font-black';
    digitsStyle = 'text-round-2-orange font-black';
    statusText = 'TIME REMAINING';
  }

  return (
    <div className={`inline-flex items-center gap-space-sm px-space-md py-1.5 rounded-xl transition-all ${containerStyle} ${className}`}>
      <span className={`material-symbols-outlined text-[24px] ${isHighUrgency || isExpired ? 'animate-bounce text-yellow-300' : 'text-round-3-purple'}`}>
        {isExpired ? 'timer_off' : 'alarm'}
      </span>
      <div className="flex flex-col leading-tight min-w-[100px]">
        <span className={`font-label-sticker text-[10px] uppercase tracking-wider font-extrabold ${labelStyle}`}>
          ⏱ {statusText}
        </span>
        <span className={`font-label-code text-xl sm:text-2xl tracking-widest font-black ${digitsStyle}`}>
          {isExpired ? '00:00' : `${mins}:${secs}`}
        </span>
      </div>
    </div>
  );
}

