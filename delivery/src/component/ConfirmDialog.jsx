const ConfirmDialog = ({
  open,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60" onClick={loading ? undefined : onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-[2rem] border border-slate-800 bg-slate-950 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex min-h-[3rem] items-center justify-center rounded-2xl border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex min-h-[3rem] items-center justify-center rounded-2xl bg-rose-500 px-4 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Cancelling..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
