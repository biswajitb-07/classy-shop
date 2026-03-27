const ErrorMessage = ({
  title = "Oops!",
  message = "Something went wrong.",
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center bg-gradient-to-br from-red-50 via-white to-red-100 rounded-2xl shadow-xl border border-red-200 animate-fadeIn">
      <div className="text-7xl animate-bounce">😞</div>
      <h2 className="mt-4 text-3xl font-bold text-red-600">{title}</h2>
      <p className="mt-2 text-gray-700 max-w-md">{message} <br />Please try after sometimes</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2 mt-6 font-semibold text-white bg-gradient-to-r from-red-500 to-red-600 rounded-full shadow-md hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-4 focus:ring-red-300 transition-transform transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          Retry
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;
