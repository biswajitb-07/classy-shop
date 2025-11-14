import { useEffect, useRef } from "react";

const LoadingSpinner = () => {
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-500 via-pink-500 to-orange-400 px-4">
      <div className="relative w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20">
        <svg
          ref={spinnerRef}
          className="absolute inset-0 w-full h-full drop-shadow-lg"
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
            const fillColor = `rgba(255, 255, 255, ${opacity})`;

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
        <p className="text-xs sm:text-sm md:text-base font-bold text-white drop-shadow-md">
          Please Wait...
        </p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
