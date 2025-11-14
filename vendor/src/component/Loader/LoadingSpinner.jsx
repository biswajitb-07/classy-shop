const LoadingSpinner = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-neutral-900 via-red-950 to-neutral-900 px-4">
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36">
        <div className="absolute inset-0 rounded-full border-[3px] sm:border-4 border-transparent border-t-red-500 animate-spin"></div>
        <div className="absolute inset-[6px] sm:inset-2 rounded-full border-[2px] border-transparent border-l-rose-400 animate-pulse border-dashed"></div>
        <div className="absolute inset-[12px] sm:inset-4 rounded-full bg-gradient-to-r from-red-500 to-rose-600 shadow-[0_0_25px_4px_rgba(239,68,68,0.5)] sm:shadow-[0_0_30px_5px_rgba(239,68,68,0.5)] animate-pulse"></div>
      </div>

      <p className="mt-4 text-lg sm:text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-300 animate-pulse">
        Loading, please wait...
      </p>
    </div>
  );
};

export default LoadingSpinner;
