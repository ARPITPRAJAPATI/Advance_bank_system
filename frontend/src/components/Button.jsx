import React, { useState } from 'react';

/**
 * Reusable Magnetic Pill Button Component
 * 
 * Advanced Motion:
 * - Magnetic Attraction: Button magnetically pulls towards mouse cursor on hover.
 * - Loading Spinner: Animated SVG spinner during async API calls.
 */
export default function Button({
  children,
  variant = 'primary', // 'primary' | 'ghost' | 'danger' | 'outline'
  size = 'md',         // 'sm' | 'md' | 'lg'
  isLoading = false,
  disabled = false,
  magnetic = true,
  className = '',
  onClick,
  type = 'button',
  ...props
}) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Magnetic Pull Physics Handler
  const handleMouseMove = (e) => {
    if (!magnetic || disabled || isLoading) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distanceX = (e.clientX - centerX) * 0.3; // 30% pull strength
    const distanceY = (e.clientY - centerY) * 0.3;
    setPosition({ x: distanceX, y: distanceY });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  // Base utility classes for pill shape, flex alignment, smooth transition & focus outlines
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full transition-transform duration-150 ease-out cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none tracking-tight';

  // Variants mapping
  const variantStyles = {
    primary: 'bg-white text-slate-950 hover:bg-slate-200 shadow-xl shadow-white/5 active:scale-95',
    ghost: 'bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-95',
    outline: 'bg-transparent text-slate-300 border border-slate-700 hover:text-white hover:border-slate-500 active:scale-95',
    danger: 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 active:scale-95'
  };

  // Size padding & typography mapping
  const sizeStyles = {
    sm: 'text-xs px-4 py-2 gap-1.5 font-medium',
    md: 'text-sm px-6 py-3 gap-2 font-semibold',
    lg: 'text-base px-8 py-4 gap-2.5 font-bold'
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
      }}
      className={`${baseStyles} ${variantStyles[variant] || variantStyles.primary} ${sizeStyles[size] || sizeStyles.md} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  );
}
