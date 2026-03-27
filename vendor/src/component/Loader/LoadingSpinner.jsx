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
    <div className="flex min-h-screen items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <div className="rounded-3xl bg-white px-8 py-7 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="relative h-12 w-12 sm:h-14 sm:w-14">
            <svg
              ref={spinnerRef}
              className="absolute inset-0 h-full w-full"
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
                const fillColor = `rgba(239, 68, 68, ${opacity})`;

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
          <p className="text-center text-sm text-gray-600 sm:text-base">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
