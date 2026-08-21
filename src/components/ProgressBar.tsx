import React from "react";

interface ProgressBarProps {
  percentage: number;
  height?: number;
  showLabel?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  height = 10,
  showLabel = false,
}) => {
  const clampedPct = Math.min(Math.max(percentage, 0), 100);

  const getColor = (pct: number): string => {
    if (pct >= 80) return "var(--color-success)";
    if (pct >= 50) return "var(--color-primary)";
    if (pct >= 25) return "var(--color-warning)";
    return "var(--color-accent)";
  };

  return (
    <div className="progress-bar-container">
      <div
        className="progress-bar-track"
        style={{ height: `${height}px` }}
      >
        <div
          className="progress-bar-fill"
          style={{
            width: `${clampedPct}%`,
            backgroundColor: getColor(clampedPct),
            height: `${height}px`,
          }}
        />
      </div>
      {showLabel && (
        <span className="progress-bar-label">%{clampedPct.toFixed(0)}</span>
      )}
    </div>
  );
};

export default ProgressBar;
