'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'danger' | 'success';
}

export default function AnimatedButton({
  children,
  onClick,
  disabled,
  className,
  style,
  type = 'button',
  variant = 'primary',
}: AnimatedButtonProps) {
  const glowColor = {
    primary: 'rgba(59,130,246,0.3)',
    danger: 'rgba(239,68,68,0.3)',
    success: 'rgba(16,185,129,0.3)',
  }[variant];

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={style}
      whileHover={
        disabled
          ? {}
          : {
              scale: 1.02,
              y: -2,
              boxShadow: `0 8px 20px ${glowColor}`,
            }
      }
      whileTap={
        disabled
          ? {}
          : {
              scale: 0.97,
              y: 0,
            }
      }
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {children}
    </motion.button>
  );
}
