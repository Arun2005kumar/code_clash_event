'use client';

import { useEffect, useRef, useState } from 'react';

export default function CustomCursor() {
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const cursorRingRef = useRef<HTMLDivElement>(null);
  const [cursorType, setCursorType] = useState<
    'default' | 'pointer' | 'text' | 'grab' | 'danger'
  >('default');
  const [isVisible, setIsVisible] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const posRef = useRef({ x: 0, y: 0 });
  const ringPosRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    // Hide default cursor on desktop hover
    if (typeof window === 'undefined') return;

    const moveCursor = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      if (!isVisible) setIsVisible(true);
    };

    const animateRing = () => {
      ringPosRef.current.x += (posRef.current.x - ringPosRef.current.x) * 0.15;
      ringPosRef.current.y += (posRef.current.y - ringPosRef.current.y) * 0.15;

      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate(${posRef.current.x - 4}px, ${posRef.current.y - 4}px)`;
      }
      if (cursorRingRef.current) {
        cursorRingRef.current.style.transform = `translate(${ringPosRef.current.x - 20}px, ${ringPosRef.current.y - 20}px)`;
      }
      rafRef.current = requestAnimationFrame(animateRing);
    };

    const detectElement = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (!el) return;
      const tag = el.tagName.toLowerCase();
      const role = el.getAttribute('role');
      const cursor = window.getComputedStyle(el).cursor;

      if (
        tag === 'button' ||
        tag === 'a' ||
        role === 'button' ||
        cursor === 'pointer' ||
        el.closest('button') ||
        el.closest('a') ||
        el.closest('[role="button"]')
      ) {
        setCursorType('pointer');
      } else if (
        tag === 'input' ||
        tag === 'textarea' ||
        el.closest('input') ||
        el.closest('textarea')
      ) {
        setCursorType('text');
      } else if (el.closest('[data-drag]')) {
        setCursorType('grab');
      } else if (el.closest('[data-danger]')) {
        setCursorType('danger');
      } else {
        setCursorType('default');
      }
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);
    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    document.addEventListener('mousemove', moveCursor);
    document.addEventListener('mousemove', detectElement);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);
    rafRef.current = requestAnimationFrame(animateRing);

    return () => {
      document.removeEventListener('mousemove', moveCursor);
      document.removeEventListener('mousemove', detectElement);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  const cursorEmoji: Record<string, string> = {
    default: '💻',
    pointer: '🖱️',
    text: '✏️',
    grab: '✊',
    danger: '⚠️',
  };

  const ringColor: Record<string, string> = {
    default: '#3b82f6',
    pointer: '#8b5cf6',
    text: '#10b981',
    grab: '#f59e0b',
    danger: '#ef4444',
  };

  return (
    <div className="custom-cursor hidden md:block">
      {/* Dot */}
      <div
        ref={cursorDotRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 8,
          height: 8,
          background: ringColor[cursorType],
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 9999999,
          transition: 'background 200ms ease, transform 0ms linear',
          transform: `scale(${isClicking ? 0.5 : 1})`,
        }}
      />
      {/* Ring */}
      <div
        ref={cursorRingRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 40,
          height: 40,
          border: `2px solid ${ringColor[cursorType]}`,
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 9999998,
          transition: 'border-color 200ms ease, width 200ms ease, height 200ms ease',
          opacity: 0.6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: cursorType === 'pointer' ? '14px' : '0px',
          transform: `scale(${isClicking ? 0.8 : 1})`,
        }}
      >
        {cursorType === 'pointer' && (
          <span style={{ fontSize: '12px', lineHeight: 1 }}>
            {cursorEmoji[cursorType]}
          </span>
        )}
      </div>
    </div>
  );
}
