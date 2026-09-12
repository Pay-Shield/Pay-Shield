import React from 'react';
import { motion } from 'motion/react';

interface BranchingConnectorProps {
  active: boolean;
  completed: boolean;
}

export const BranchingConnector: React.FC<BranchingConnectorProps> = ({ active, completed }) => {
  return (
    <div className="relative my-1 hidden h-12 w-full md:block">
      <svg
        viewBox="0 0 1000 50"
        className="h-full w-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="branchGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* 4 Branching paths from center (500, 0) to 4 columns: (125, 50), (375, 50), (625, 50), (875, 50) */}
        {[125, 375, 625, 875].map((targetX, idx) => (
          <g key={targetX}>
            {/* Background passive track */}
            <path
              d={`M 500 0 C 500 25, ${targetX} 25, ${targetX} 50`}
              fill="none"
              stroke="#1E293B"
              strokeWidth="1.5"
            />

            {/* Active streaming line */}
            {(active || completed) && (
              <motion.path
                d={`M 500 0 C 500 25, ${targetX} 25, ${targetX} 50`}
                fill="none"
                stroke="url(#branchGlow)"
                strokeWidth="2"
                strokeDasharray="4 4"
                initial={{ strokeDashoffset: 24 }}
                animate={active ? { strokeDashoffset: 0 } : { strokeDashoffset: 0 }}
                transition={{
                  duration: 0.8,
                  repeat: active ? Infinity : 0,
                  ease: 'linear',
                  delay: idx * 0.06,
                }}
              />
            )}

            {/* Streaming data particle */}
            {active && (
              <motion.circle
                r="2.5"
                fill="#60A5FA"
                initial={{ offsetDistance: '0%' }}
                animate={{ offsetDistance: '100%' }}
                transition={{
                  duration: 0.85,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: idx * 0.1,
                }}
                style={{
                  offsetPath: `path('M 500 0 C 500 25, ${targetX} 25, ${targetX} 50')`,
                }}
              />
            )}
          </g>
        ))}

        {/* Central fan-out hub node */}
        <circle cx="500" cy="0" r="4" fill="#3B82F6" />
        <circle cx="500" cy="0" r="1.5" fill="#FFFFFF" />
      </svg>
    </div>
  );
};

interface ConvergingConnectorProps {
  active: boolean;
  completed: boolean;
}

export const ConvergingConnector: React.FC<ConvergingConnectorProps> = ({ active, completed }) => {
  return (
    <div className="relative my-1 hidden h-12 w-full md:block">
      <svg
        viewBox="0 0 1000 50"
        className="h-full w-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="convergeGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* 4 Converging paths from columns (125, 0), (375, 0), (625, 0), (875, 0) to center (500, 50) */}
        {[125, 375, 625, 875].map((startX, idx) => (
          <g key={startX}>
            {/* Background track */}
            <path
              d={`M ${startX} 0 C ${startX} 25, 500 25, 500 50`}
              fill="none"
              stroke="#1E293B"
              strokeWidth="1.5"
            />

            {/* Active streaming path */}
            {(active || completed) && (
              <motion.path
                d={`M ${startX} 0 C ${startX} 25, 500 25, 500 50`}
                fill="none"
                stroke="url(#convergeGlow)"
                strokeWidth="2"
                strokeDasharray="4 4"
                initial={{ strokeDashoffset: 24 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{
                  duration: 0.8,
                  repeat: active ? Infinity : 0,
                  ease: 'linear',
                  delay: idx * 0.06,
                }}
              />
            )}

            {/* Streaming data particle into center */}
            {active && (
              <motion.circle
                r="2.5"
                fill="#60A5FA"
                initial={{ offsetDistance: '0%' }}
                animate={{ offsetDistance: '100%' }}
                transition={{
                  duration: 0.85,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: idx * 0.1,
                }}
                style={{
                  offsetPath: `path('M ${startX} 0 C ${startX} 25, 500 25, 500 50')`,
                }}
              />
            )}
          </g>
        ))}

        {/* Central convergence node */}
        <circle cx="500" cy="50" r="4" fill="#3B82F6" />
        <circle cx="500" cy="50" r="1.5" fill="#FFFFFF" />
      </svg>
    </div>
  );
};

export const VerticalStemConnector: React.FC<{ active: boolean; completed: boolean; color?: string }> = ({
  active,
  completed,
  color = '#3B82F6',
}) => {
  return (
    <div className="relative flex h-7 w-full items-center justify-center">
      <div className="relative h-full w-0.5 bg-slate-800">
        {(active || completed) && (
          <motion.div
            className="absolute inset-0 w-full"
            style={{ backgroundColor: color }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}
        {active && (
          <motion.div
            className="absolute -left-1 h-2.5 w-2.5 rounded-full bg-blue-400"
            animate={{ y: [0, 20, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </div>
    </div>
  );
};
