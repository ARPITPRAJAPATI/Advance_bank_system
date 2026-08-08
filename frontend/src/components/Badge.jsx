import React from 'react';

/**
 * Reusable Status Badge Chip Component
 * 
 * Concept Explanation for Learning:
 * - Used to display status of accounts (Active/Suspended) or transactions (Completed/Pending/Failed).
 * - Color tokens follow accessible contrast rules on dark themes.
 */
export default function Badge({
  children,
  variant = 'success', // 'success' | 'pending' | 'danger' | 'info' | 'system'
  size = 'md',        // 'sm' | 'md'
  dot = true,
  className = ''
}) {
  const variantStyles = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-red-500/10 text-red-400 border-red-500/20',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    system: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
  };

  const dotStyles = {
    success: 'bg-emerald-400',
    pending: 'bg-amber-400 animate-pulse',
    danger: 'bg-red-400',
    info: 'bg-blue-400',
    system: 'bg-purple-400'
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2.5 py-0.5 gap-1.5',
    md: 'text-xs px-3 py-1 gap-2'
  };

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full border border-solid tracking-tight select-none
        ${variantStyles[variant] || variantStyles.success}
        ${sizeStyles[size] || sizeStyles.md}
        ${className}
      `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[variant] || dotStyles.success}`} />
      )}
      {children}
    </span>
  );
}
