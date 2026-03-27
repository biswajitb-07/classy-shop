import AuthButtonLoader from "../../../component/Loader/AuthButtonLoader";

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType,
  isLoading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-50"></div>
      <div className="relative bg-white rounded-xl p-6 w-full max-w-md shadow-2xl z-10">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Confirm Delete
        </h3>
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete the {itemType} "
          <strong>{itemName}</strong>"? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition flex items-center gap-2 cursor-pointer disabled:bg-red-400"
          >
            {isLoading ? (
              <>
                <AuthButtonLoader color="#ffffff" size={16} />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
