// File guide: AuthButtonLoader source file.
// This file belongs to the vendor app architecture and has a focused responsibility within its module/folder.
const sizeMap = {
  small: "h-4 w-4",
  medium: "h-5 w-5",
  large: "h-6 w-6",
};

/*
  Shared button spinner so action buttons across the vendor workspace keep the
  same loading affordance while still allowing local color/size overrides.
*/
const AuthButtonLoader = ({
  size = "medium",
  className = "",
  trackClassName = "border-red-200",
  spinnerClassName = "border-red-500",
}) => {
  const sizeClass = typeof size === "string" ? sizeMap[size] || sizeMap.medium : "";
  const sizeStyle =
    typeof size === "number" ? { width: `${size}px`, height: `${size}px` } : undefined;

  return (
    <div className={`flex items-center justify-center ${className}`} aria-hidden="true">
      <div className={`relative ${sizeClass}`} style={sizeStyle}>
      <div className={`absolute h-full w-full rounded-full border-2 ${trackClassName}`}></div>
      <div
        className={`absolute h-full w-full animate-spin rounded-full border-2 border-t-transparent ${spinnerClassName}`}
      ></div>
      </div>
    </div>
  );
};

export default AuthButtonLoader;
