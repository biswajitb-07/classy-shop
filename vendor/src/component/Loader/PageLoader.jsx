const PageLoader = ({ message = "Loading products..." }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="w-12 h-12 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="3" r="1.5" fill="#EF4444" opacity="1" />
            <circle cx="16.95" cy="5.05" r="1.5" fill="#EF4444" opacity="0.8" />
            <circle cx="21" cy="12" r="1.5" fill="#EF4444" opacity="0.6" />
            <circle
              cx="16.95"
              cy="18.95"
              r="1.5"
              fill="#EF4444"
              opacity="0.4"
            />
            <circle cx="12" cy="21" r="1.5" fill="#EF4444" opacity="0.3" />
            <circle cx="7.05" cy="18.95" r="1.5" fill="#EF4444" opacity="0.2" />
            <circle cx="3" cy="12" r="1.5" fill="#EF4444" opacity="0.1" />
            <circle cx="7.05" cy="5.05" r="1.5" fill="#EF4444" opacity="0.05" />
          </svg>
        </div>
      </div>
      {message && <p className="text-gray-600 text-sm">{message}</p>}
    </div>
  );
};

export default PageLoader;
