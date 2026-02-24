import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// Service types shown on the homepage
const services = [
  { icon: '🏠', title: 'Boarding', description: 'Your pet stays at the sitter\'s home overnight.' },
  { icon: '☀️', title: 'Doggy Daycare', description: 'Drop off in the morning, pick up in the evening.' },
  { icon: '🚶', title: 'Dog Walking', description: '30 or 60-minute walks in your neighborhood.' },
  { icon: '🔑', title: 'Drop-In Visits', description: 'A sitter visits your home to check in on your pet.' },
];

// Trust stats shown below the hero
const stats = [
  { value: '1,000+', label: 'Trusted Sitters' },
  { value: '5,000+', label: 'Happy Pets' },
  { value: '4.9★', label: 'Average Rating' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [city, setCity] = useState('');

  // Navigate to SearchPage, passing the city as a ?city= query param.
  // SearchPage reads this param to pre-populate the city filter.
  function handleSearch() {
    const dest = city.trim()
      ? `/search?city=${encodeURIComponent(city.trim())}`
      : '/search';
    navigate(dest);
  }

  return (
    <div>

      {/* ── Hero Section ── */}
      <section className="bg-linear-to-br from-teal-50 to-cyan-100 py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
            Trusted Pet Care,<br />
            <span className="text-teal-600">Right in Your Neighborhood</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Find loving pet sitters and dog walkers. Book with confidence — every sitter is reviewed by your neighbors.
          </p>

          {/* Search bar — wired to SearchPage with ?city= query param */}
          <div className="bg-white rounded-2xl shadow-lg p-2 flex flex-col sm:flex-row gap-2 max-w-xl mx-auto">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter your city or zip code..."
              className="flex-1 px-4 py-3 rounded-xl text-gray-700 outline-none focus:ring-2 focus:ring-teal-400"
            />
            <button
              onClick={handleSearch}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-center"
            >
              Find Sitters
            </button>
          </div>
        </div>
      </section>

      {/* ── Stats Strip ── */}
      <section className="bg-teal-600 py-8 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 text-center text-white">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl font-extrabold">{stat.value}</p>
              <p className="text-teal-100 text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Services Section ── */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-2">
            Services Available
          </h2>
          <p className="text-gray-500 text-center mb-10">
            Whatever your pet needs, we have a sitter for it.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service) => (
              <Link
                key={service.title}
                to="/search"
                className="bg-gray-50 hover:bg-teal-50 border border-gray-100 hover:border-teal-200 rounded-2xl p-6 text-center transition-all group"
              >
                <span className="text-4xl">{service.icon}</span>
                <h3 className="text-lg font-semibold text-gray-800 mt-3 mb-1 group-hover:text-teal-700">
                  {service.title}
                </h3>
                <p className="text-sm text-gray-500">{service.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works Section ── */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">
            How BowBow Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Search', desc: 'Enter your city and find sitters near you.' },
              { step: '2', title: 'Book', desc: 'Send a booking request with your dates and pet details.' },
              { step: '3', title: 'Relax', desc: 'Your pet is in loving hands. Review after the stay.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-teal-600 text-white text-xl font-bold flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="py-16 px-4 bg-teal-600 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Love animals? Become a sitter.</h2>
        <p className="text-teal-100 mb-8 text-lg">
          Set your own schedule, work from home, and earn money doing what you love.
        </p>
        <Link
          to="/sign-up"
          className="bg-white text-teal-700 hover:bg-teal-50 font-semibold px-8 py-3 rounded-xl transition-colors inline-block"
        >
          Get Started
        </Link>
      </section>

    </div>
  );
}
