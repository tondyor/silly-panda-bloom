import React from 'react';
import './CountdownCircle.css';

interface CountdownCircleProps {
  duration: number;
  size?: number;
  strokeWidth?: number;
  key: React.Key;
}

const CountdownCircle: React.FC<CountdownCircleProps> = ({ duration, size = 16, strokeWidth = 2.5, key }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg key={key} width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted-foreground) / 0.2)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          className="countdown-circle-progress"
          style={{
            '--circumference': circumference,
            animationDuration: `${duration}s`,
          } as React.CSSProperties}
        />
      </svg>
    </div>
  );
};

export default CountdownCircle;