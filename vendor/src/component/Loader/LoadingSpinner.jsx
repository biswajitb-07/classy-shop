// File guide: LoadingSpinner source file.
// This file belongs to the vendor app architecture and has a focused responsibility within its module/folder.
import { useEffect, useRef } from "react";

/*
  Full-page loader used while the vendor app resolves the authenticated session
  before we render the dashboard shell. Message stays configurable for reuse.
*/
const LoadingSpinner = ({ message = "Loading Vendor Workspace..." }) => {
  const spinnerRef = useRef(null);

  useEffect(() => {
    const spinner = spinnerRef.current;
    let animationFrameId;
    let start;

    const rotate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = timestamp - start;
      const rotation = (progress / 4) % 360;
      if (spinner) {
        spinner.style.transform = `rotate(${rotation}deg)`;
      }
      animationFrameId = requestAnimationFrame(rotate);
    };

    animationFrameId = requestAnimationFrame(rotate);

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4">
      <div className="relative h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20">
        <svg
          ref={spinnerRef}
          className="absolute inset-0 h-full w-full drop-shadow-[0_0_18px_rgba(56,189,248,0.28)]"
          viewBox="0 0 100 100"
          role="img"
          aria-label="Loading spinner"
        >
          {[...Array(8)].map((_, index) => {
            const angle = (index / 8) * 360;
            const radius = 35;
            const x = 50 + radius * Math.cos((angle * Math.PI) / 180);
            const y = 50 + radius * Math.sin((angle * Math.PI) / 180);
            const opacity = 1 - index / 8;
            const fillColor = `rgba(56, 189, 248, ${opacity})`;

            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="7"
                fill={fillColor}
                className="transition-all duration-200 ease-in-out"
              />
            );
          })}
        </svg>
      </div>

      <div className="mt-4 text-center">
        <p className="bg-gradient-to-r from-sky-300 via-cyan-200 to-indigo-300 bg-clip-text text-xs font-bold text-transparent drop-shadow-md sm:text-sm md:text-base">
          {message}
        </p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
