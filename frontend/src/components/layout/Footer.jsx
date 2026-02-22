import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-300 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-10">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Brand */}
          <div>
            <p className="text-white text-xl font-bold mb-2">🐾 BowBow</p>
            <p className="text-sm text-gray-400">
              Trusted pet care, whenever you need it. Connect with loving pet sitters in your neighborhood.
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="text-white font-semibold mb-3">Explore</p>
            <ul className="space-y-2 text-sm">
              <li><Link to="/search" className="hover:text-white transition-colors">Find a Sitter</Link></li>
              <li><Link to="/sign-up" className="hover:text-white transition-colors">Become a Sitter</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <p className="text-white font-semibold mb-3">Support</p>
            <ul className="space-y-2 text-sm">
              <li><span className="text-gray-400">help@bowbow.com</span></li>
            </ul>
          </div>

        </div>

        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} BowBow. All rights reserved.
        </div>

      </div>
    </footer>
  );
}
