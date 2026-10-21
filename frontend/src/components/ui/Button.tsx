import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className,
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm select-none';

  const variantClasses = {
    primary: 'bg-navy-900 hover:bg-navy-800 text-white focus:ring-navy-800 border border-navy-800',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 focus:ring-slate-300 border border-slate-200',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500 border border-rose-600',
    outline: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 focus:ring-slate-400',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 border-none shadow-none focus:ring-slate-300',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 border border-emerald-600'
  };

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5'
  };

  return (
    <button
      className={twMerge(clsx(baseClasses, variantClasses[variant], sizeClasses[size], className))}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : icon ? (
        <span className="w-4 h-4 shrink-0 flex items-center">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};
