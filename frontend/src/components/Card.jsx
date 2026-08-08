import React from 'react';

/**
 * Reusable Glass Card Component
 * 
 * Concept Explanation for Learning:
 * - `hoverable`: Adds subtle scale and border brightness when user hovers over interactive cards (e.g. Account Cards, Quick Actions).
 * - `glow`: Adds a subtle ambient radial glow behind the card for hero elements.
 */
export default function Card({
  children,
  className = '',
  hoverable = false,
  glow = false,
  padding = 'md', // 'none' | 'sm' | 'md' | 'lg'
  onClick,
  ...props
}) {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6 md:p-8',
    lg: 'p-8 md:p-12'
  };

  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden
        bg-[#12161F]/75 backdrop-blur-xl
        border border-white/[0.08] rounded-2xl
        shadow-xl shadow-black/40
        transition-all duration-300
        ${hoverable ? 'hover:border-white/[0.18] hover:-translate-y-1 hover:shadow-2xl cursor-pointer' : ''}
        ${paddingStyles[padding] || paddingStyles.md}
        ${className}
      `}
      {...props}
    >
      {/* Optional ambient background glow inside card */}
      {glow && (
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/[0.04] rounded-full blur-3xl pointer-events-none" />
      )}
      
      {children}
    </div>
  );
}
