import Navbar from './Navbar';
import Footer from './Footer';

// Layout wraps every page with the shared Navbar and Footer.
// Any page component passed as `children` will appear between them.
export default function Layout({ children }) {
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
