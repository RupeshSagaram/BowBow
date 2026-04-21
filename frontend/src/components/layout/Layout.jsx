import { useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

// Layout wraps every page with the shared Navbar and Footer.
// Any page component passed as `children` will appear between them.
export default function Layout({ children }) {
  // Ping the backend whenever the user returns to this tab so Render's free-tier
  // server is already warm by the time they click an action button (e.g. "I've Paid").
  useEffect(() => {
    const warmup = () =>
      fetch(`${import.meta.env.VITE_API_URL}/api/health`).catch(() => {});

    warmup();

    const onVisible = () => {
      if (document.visibilityState === 'visible') warmup();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
