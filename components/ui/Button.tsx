'use client';

// components/ui/Button.tsx
import { motion } from 'framer-motion';
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'navy';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  shimmer?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, shimmer, children, disabled, ...props }, ref) => {
    const base = 'relative inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 overflow-hidden select-none focus:outline-none focus:ring-2 focus:ring-offset-2';

    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 active:scale-[0.97]',
      secondary: 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 focus:ring-slate-300 active:scale-[0.97]',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 active:scale-[0.97]',
      ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-300 active:scale-[0.97]',
      navy: 'bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-700 active:scale-[0.97]',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-5 py-2.5 text-sm gap-2',
      lg: 'px-6 py-3.5 text-base gap-2.5',
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        className={cn(base, variants[variant], sizes[size], disabled || loading ? 'opacity-50 cursor-not-allowed' : '', className)}
        disabled={disabled || loading}
        {...(props as any)}
      >
        {/* Shimmer overlay on hover */}
        {shimmer && !disabled && !loading && (
          <span className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
            <span className="shimmer-sweep" />
          </span>
        )}

        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Loading...</span>
          </>
        ) : children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
