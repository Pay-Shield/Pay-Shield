import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

interface CardProps extends HTMLMotionProps<'div'> {
  variant?: 'surface' | 'secondary' | 'glass' | 'hero';
  hoverEffect?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'surface',
  hoverEffect = false,
  className = '',
  children,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'surface':
        return 'bg-[#0E1526] border-slate-800/80 shadow-sm';
      case 'secondary':
        return 'bg-[#131C30] border-slate-700/70 shadow-sm';
      case 'glass':
        return 'bg-[#0E1526]/80 backdrop-blur-md border-slate-800/80 shadow-sm';
      case 'hero':
        return 'bg-gradient-to-b from-[#10182D] to-[#0A0F1D] border-slate-800 shadow-md';
    }
  };

  return (
    <motion.div
      whileHover={
        hoverEffect
          ? {
              y: -1.5,
              borderColor: 'rgba(59, 130, 246, 0.35)',
              transition: { duration: 0.15 },
            }
          : undefined
      }
      className={`rounded-xl border transition-all ${getVariantStyles()} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};
