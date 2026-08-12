import React from 'react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  onClick,
  type = 'button',
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none tracking-tight';

  const variants = {
    primary: 'bg-white text-slate-950 hover:bg-slate-200 active:scale-95 shadow-md shadow-white/5',
    ghost: 'bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-95',
    outline: 'bg-transparent text-slate-300 border border-slate-700 hover:text-white hover:border-slate-500 active:scale-95',
    danger: 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 active:scale-95',
  };

  const sizes = {
    sm: 'text-xs px-4 py-2 gap-1.5 font-medium',
    md: 'text-sm px-6 py-3 gap-2 font-semibold',
    lg: 'text-base px-8 py-4 gap-2.5 font-bold',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
