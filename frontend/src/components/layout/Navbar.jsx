import { Link, NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="text-2xl font-bold text-teal-600 tracking-tight">
          🐾 BowBow
        </Link>

        {/* Navigation links */}
        <div className="hidden md:flex items-center gap-6">
          <NavLink
            to="/search"
            className={({ isActive }) =>
              isActive
                ? 'text-teal-600 font-semibold'
                : 'text-gray-600 hover:text-teal-600 transition-colors'
            }
          >
            Find a Sitter
          </NavLink>
        </div>

        {/* Auth buttons — we'll wire these up in Feature 2 (Authentication) */}
        <div className="flex items-center gap-3">
          <Link
            to="/sign-in"
            className="text-gray-600 hover:text-teal-600 font-medium transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/sign-up"
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Sign Up
          </Link>
        </div>

      </div>
    </nav>
  );
}
