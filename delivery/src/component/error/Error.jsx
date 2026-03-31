const Error = ({ title = "Something went wrong", message, onRetry }) => {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-3xl border border-rose-100 bg-white p-8 text-center shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        <p className="mt-3 text-sm text-slate-600">
          {message || "Please try again after a moment."}
        </p>
        {onRetry ? (
          <button
            onClick={onRetry}
            className="mt-6 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default Error;
