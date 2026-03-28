import { WiCloud } from "react-icons/wi";

const ProductNotAvailable = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] bg-gray-50 rounded-lg p-6 text-center mb-16 shadow-md">
      <WiCloud className="text-gray-400 w-24 h-24 mb-4 animate-pulse" />
      <h2 className="text-2xl font-semibold text-gray-700 mb-2">
        No Products Available
      </h2>
      <p className="text-gray-500 mb-4 max-w-md">
        It seems there are no products matching your current selection. Try
        adjusting your filters or explore other categories.
      </p>
    </div>
  );
};

export default ProductNotAvailable;
