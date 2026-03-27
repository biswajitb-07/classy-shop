// File guide: AuthButtonLoader source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
const AuthButtonLoader = () => (
  <div className="flex justify-center items-center">
    <div className="relative w-5 h-5">
      <div className="absolute w-full h-full rounded-full border-2 border-red-200"></div>
      <div className="absolute w-full h-full rounded-full border-2 border-red-500 border-t-transparent animate-spin"></div>
    </div>
  </div>
);

export default AuthButtonLoader;
