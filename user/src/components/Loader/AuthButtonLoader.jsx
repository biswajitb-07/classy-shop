const sizeMap = {
  small: "h-4 w-4",
  medium: "h-5 w-5",
  large: "h-6 w-6",
};

const AuthButtonLoader = ({
  size = "medium",
  className = "",
  color,
  trackClassName = "border-red-200",
  spinnerClassName = "border-red-500",
}) => {
  const sizeClass = typeof size === "string" ? sizeMap[size] || sizeMap.medium : "";
  const sizeStyle =
    typeof size === "number" ? { width: `${size}px`, height: `${size}px` } : undefined;

  const resolvedTrackClass = color ? "" : trackClassName;
  const resolvedSpinnerClass = color ? "" : spinnerClassName;

  return (
    <div className={`flex items-center justify-center ${className}`} aria-hidden="true">
      <div className={`relative ${sizeClass}`} style={sizeStyle}>
        <div
          className={`absolute h-full w-full rounded-full border-2 ${resolvedTrackClass}`}
          style={color ? { borderColor: `${color}33` } : undefined}
        ></div>
        <div
          className={`absolute h-full w-full animate-spin rounded-full border-2 border-t-transparent ${resolvedSpinnerClass}`}
          style={color ? { borderColor: color, borderTopColor: "transparent" } : undefined}
        ></div>
      </div>
    </div>
  );
};

export default AuthButtonLoader;
