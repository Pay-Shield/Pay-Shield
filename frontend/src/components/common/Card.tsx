import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

interface CardProps extends HTMLMotionProps<'div'> {
  variant?: 'surface' | 'secondary' | 'glass';
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
        return 'bg-[#111827] border-slate-800/80';
      case 'secondary':
        return 'bg-[#172033] border-slate-700/80';
      case 'glass':
        return 'bg-[#111827]/70 backdrop-blur-md border-slate-800/80';
    }
  };

  return (
    <motion.div
      whileHover={
        hoverEffect
          ? {
              y: -2,
              borderColor: 'rgba(59, 130, 246, 0.4)',
              transition: { duration: 0.2 },
            }
          : undefined
      }
      className={`rounded-xl border p-5 transition-shadow ${getVariantStyles()} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};
