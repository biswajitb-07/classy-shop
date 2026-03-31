const PageLoader = ({ message = "Loading..." }) => {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
      <div className="h-14 w-14 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
      <p className="text-sm font-medium text-slate-600">{message}</p>
    </div>
  );
};

export default PageLoader;
