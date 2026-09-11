import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-sm hover:shadow-blue-500/20 border border-blue-500/30 active:bg-blue-700';
      case 'secondary':
        return 'bg-[#172033] hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 font-medium active:bg-[#111827]';
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-500 text-white font-medium border border-rose-500/30 shadow-sm active:bg-rose-700';
      case 'outline':
        return 'bg-transparent hover:bg-slate-800/60 text-slate-300 border border-slate-700 hover:border-slate-500 font-medium';
      case 'ghost':
        return 'bg-transparent hover:bg-slate-800/50 text-slate-300 hover:text-white font-medium';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-xs gap-1.5 rounded-md';
      case 'md':
        return 'px-4 py-2 text-sm gap-2 rounded-lg';
      case 'lg':
        return 'px-6 py-3 text-base gap-2.5 rounded-lg';
    }
  };

  return (
    <motion.button
      whileHover={{ scale: disabled || isLoading ? 1 : 1.015 }}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      transition={{ duration: 0.15 }}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-sans tracking-wide transition-colors cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${getVariantStyles()} ${getSizeStyles()} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : (
        leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
    </motion.button>
  );
};
