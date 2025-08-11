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
  const [progress, setProgress] = useState(1);
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
      // progress goes from 1 (start) to 0 (end)
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

  // `progress` goes from 1 to 0.
  // To show the "passed" path, we want the circle to fill up.
  // The offset should go from `circumference` (empty) to 0 (full).
  // `circumference * progress` will achieve this.
  const strokeDashoffset = circumference * progress;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="hsl(210 40% 96.1%)" // light gray background
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="hsl(0 84.2% 60.2%)" // red for the passed path
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.1s linear' }}
      />
    </svg>
  );
};

export default CountdownCircle;