import React, { useState, useEffect } from 'react';

interface CountdownCircleProps {
  duration: number; // in seconds
  size?: number;
  strokeWidth?: number;
}

const CountdownCircle: React.FC<CountdownCircleProps> = ({
  duration,
  size = 20,
  strokeWidth = 2,
}) => {
  const [progress, setProgress] = useState(1); // 1 = start, 0 = end
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    let startTime: number;
    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (startTime === undefined) {
        startTime = timestamp;
      }
      const elapsed = timestamp - startTime;
      const newProgress = 1 - elapsed / (duration * 1000);

      if (newProgress > 0) {
        setProgress(newProgress);
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setProgress(0);
        // Restart animation
        startTime = performance.now();
        requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [duration]);

  // For the shrinking green circle, offset goes from 0 to circumference.
  // progress goes from 1 to 0.
  // (1 - progress) goes from 0 to 1.
  // So, offset = circumference * (1 - progress).
  const greenStrokeDashoffset = circumference * (1 - progress);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* 1. Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="hsl(210 40% 96.1%)" // light gray background
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      {/* 2. Red trail (static, full circle, revealed by green circle shrinking) */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="hsl(0 84.2% 60.2%)" // red for the passed path
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={0} // Always full
        strokeLinecap="round"
      />
      {/* 3. Green remaining time (shrinking circle) */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#22c55e" // Tailwind green-500
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={greenStrokeDashoffset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.1s linear' }}
      />
    </svg>
  );
};

export default CountdownCircle;