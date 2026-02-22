import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';

// App.jsx is the "map" of our entire website.
// Each <Route> connects a URL path to a page component.
// New routes will be added here as we build each feature.
function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
