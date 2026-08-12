import React from 'react';

export default function Input({
  label,
  error,
  helperText,
  icon: Icon,
  type = 'text',
  placeholder = '',
  value,
  onChange,
  disabled = false,
  required = false,
  className = '',
  name,
  id,
  ...props
}) {
  const inputId = id || name || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`flex flex-col gap-1.5 w-full text-left ${className}`}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-slate-300 tracking-wide flex items-center justify-between">
          <span>
            {label} {required && <span className="text-red-400">*</span>}
          </span>
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center justify-center">
            <Icon size={18} />
          </div>
        )}

        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`
            w-full bg-slate-950/60 text-white placeholder-slate-500
            text-sm rounded-xl py-3
            ${Icon ? 'pl-10 pr-4' : 'px-4'}
            border transition-all duration-200 outline-none
            ${error 
              ? 'border-red-500/50 focus:border-red-400 focus:ring-2 focus:ring-red-500/10' 
              : 'border-white/10 focus:border-white/30 focus:ring-2 focus:ring-white/10 hover:border-white/20'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          {...props}
        />
      </div>

      {error ? (
        <span className="text-xs text-red-400 font-medium">
          {error}
        </span>
      ) : helperText ? (
        <span className="text-xs text-slate-500">
          {helperText}
        </span>
      ) : null}
    </div>
  );
}
