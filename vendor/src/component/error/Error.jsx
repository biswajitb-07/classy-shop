import { NavLink } from "react-router-dom";

const Error = () => (
  <main className="flex min-h-screen w-full items-center justify-center bg-neutral-900 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 px-4 py-10 text-white">
    <div className="max-w-sm text-center sm:max-w-md md:max-w-lg lg:max-w-xl">
      <h1 className="relative mb-2 text-8xl font-black text-red-500 sm:text-9xl md:text-[10rem] lg:text-[11rem]">
        404
        <span
          aria-hidden
          className="absolute inset-0 left-px top-px animate-pulse text-cyan-400/50 blur-sm"
        >
          404
        </span>
        <span
          aria-hidden
          className="absolute inset-0 -left-px top-px animate-pulse text-red-400/50 blur-sm"
        >
          404
        </span>
      </h1>

      <h2 className="mb-3 text-xl font-medium text-red-400 sm:text-2xl md:text-3xl">
        Sorry! Page not found
      </h2>

      <p className="mb-8 text-sm text-neutral-300 sm:text-base">
        The page you’re looking for doesn’t exist. If you think this is an
        error, please let us know and we’ll investigate.
      </p>

      {/* buttons */}
      <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
        <NavLink
          to="/"
          className="w-full rounded-md bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500 sm:w-auto"
        >
          Return Home
        </NavLink>
        <NavLink
          to="/contact"
          className="w-full rounded-md border border-red-600 px-5 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-600 hover:text-white sm:w-auto"
        >
          Report Problem
        </NavLink>
      </div>
    </div>
  </main>
);

export default Error;
