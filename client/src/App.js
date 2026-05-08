import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './contexts/AuthContext';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

// Lazy load pages for performance
const Home = lazy(() => import('./pages/Home'));
const Proposals = lazy(() => import('./pages/Proposals'));
const ProposalDetail = lazy(() => import('./pages/ProposalDetail'));
const SubmitProposal = lazy(() => import('./pages/SubmitProposal'));
const Statistics = lazy(() => import('./pages/Statistics'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Profile = lazy(() => import('./pages/Profile'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Offline = lazy(() => import('./pages/Offline'));

// Loading skeleton
const PageLoader = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    flexDirection: 'column',
    gap: '1rem'
  }}>
    <div className="loading-spinner" />
    <p style={{ color: 'var(--drc-blue)', fontWeight: 500 }}>
      Chargement...
    </p>
  </div>
);

// Animated page wrapper
const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.28, ease: 'easeOut' }}
  >
    {children}
  </motion.div>
);

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

// Scroll-to-top button
const ScrollToTopButton = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      title="Retour en haut"
      style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #0D47A1, #1565C0)',
        color: 'white',
        border: 'none',
        cursor: 'pointer',
        fontSize: '1.4rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(13, 71, 161, 0.4)',
        zIndex: 999,
      }}
    >
      ↑
    </motion.button>
  );
};

// Scroll to top on route change
const ScrollRestorer = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

function App() {
  const { isOffline } = useAuth();
  const location = useLocation();

  if (isOffline) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Offline />
      </Suspense>
    );
  }

  return (
    <div className="app">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '0.75rem',
            fontWeight: 600,
            fontSize: '0.95rem',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          },
          success: {
            iconTheme: { primary: '#16A34A', secondary: 'white' },
            style: { background: '#F0FDF4', color: '#14532D', border: '1px solid #BBF7D0' },
          },
          error: {
            iconTheme: { primary: '#DC2626', secondary: 'white' },
            style: { background: '#FEF2F2', color: '#7F1D1D', border: '1px solid #FECACA' },
          },
        }}
      />

      <Header />
      <ScrollRestorer />

      <main className="main-content">
        <AnimatePresence mode="wait">
          <Suspense fallback={<PageLoader />}>
            <Routes location={location} key={location.pathname}>
              {/* Public Routes */}
              <Route path="/" element={<PageTransition><Home /></PageTransition>} />
              <Route path="/proposals" element={<PageTransition><Proposals /></PageTransition>} />
              <Route path="/proposals/:id" element={<PageTransition><ProposalDetail /></PageTransition>} />
              <Route path="/statistics" element={<PageTransition><Statistics /></PageTransition>} />
              <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
              <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
              <Route path="/terms" element={<PageTransition><Terms /></PageTransition>} />
              <Route path="/privacy" element={<PageTransition><Privacy /></PageTransition>} />

              {/* Protected Routes */}
              <Route path="/submit-proposal" element={
                <ProtectedRoute>
                  <PageTransition><SubmitProposal /></PageTransition>
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <PageTransition><Profile /></PageTransition>
                </ProtectedRoute>
              } />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AnimatePresence>
      </main>

      <Footer />
      <ScrollToTopButton />
    </div>
  );
}

export default App;
