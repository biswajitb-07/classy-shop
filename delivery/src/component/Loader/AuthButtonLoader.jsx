const AuthButtonLoader = ({ size = 18, className = "" }) => {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-white/30 border-t-white ${className}`}
      style={{ width: size, height: size }}
    />
  );
};

export default AuthButtonLoader;
