// App.tsx - Updated with proper auth guards (no routing needed)
import { useState, useEffect } from 'react';
import { AppView, Gig } from './types';
import { initialGigs } from './data';
import LandingView from './components/LandingView';
import EmployerDashboardView from './components/EmployerDashboardView';
import WorkerBrowseView from './components/WorkerBrowseView';
import WorkerReliabilityView from './components/WorkerReliabilityView';
import LoginPage from './pages/LoginPage';
import { User, X, Check, Mail, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { user, userRole, loading, logOut, switchRole } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>(AppView.Landing);
  const [gigs, setGigs] = useState<Gig[]>(initialGigs);
  const [showSelector, setShowSelector] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'worker' | 'employer'>('worker');
  const [authError, setAuthError] = useState<string | null>(null);
  // Shown instead of a browser alert when the signed-in role cannot open a page
  const [roleNotice, setRoleNotice] = useState<{ needed: 'worker' | 'employer'; view: AppView; error?: string } | null>(null);

  const switchAndGo = async () => {
    if (!roleNotice) return;
    try {
      await switchRole(roleNotice.needed);
      setCurrentView(roleNotice.view);
      setRoleNotice(null);
    } catch {
      setRoleNotice({ ...roleNotice, error: `This account does not have ${roleNotice.needed} access.` });
    }
  };

  // Handle role-based navigation after login
  useEffect(() => {
    if (user && userRole) {
      if (userRole === 'employer') {
        setCurrentView(AppView.EmployerDashboard);
      } else {
        setCurrentView(AppView.WorkerBrowse);
      }
      setShowSelector(false);
      setShowLoginModal(false);
    }
  }, [user, userRole]);

  const handleAddGig = (newGig: Gig) => {
    setGigs(prev => [newGig, ...prev]);
  };

  // Protected view checker
  const requiresAuth = (view: AppView): boolean => {
    return view === AppView.EmployerDashboard || 
           view === AppView.WorkerBrowse || 
           view === AppView.WorkerReliability;
  };

  const handleNavigate = (view: AppView) => {
    if (requiresAuth(view) && !user) {
      setShowLoginModal(true);
      setSelectedRole(view === AppView.EmployerDashboard ? 'employer' : 'worker');
      return;
    }
    
    // Role validation
    if (view === AppView.EmployerDashboard && userRole !== 'employer' && userRole !== 'both') {
      setRoleNotice({ needed: 'employer', view });
      return;
    }
    
    if ((view === AppView.WorkerBrowse || view === AppView.WorkerReliability) && userRole !== 'worker' && userRole !== 'both') {
      setRoleNotice({ needed: 'worker', view });
      return;
    }
    
    setRoleNotice(null);
    setCurrentView(view);
    setShowSelector(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-on-surface-variant">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased transition-colors">
      {/* Render current view with auth checks */}
      <div>
        {currentView === AppView.Landing && (
          <LandingView
            onNavigate={handleNavigate}
            onOpenSelector={() => user ? setShowSelector(true) : setShowLoginModal(true)}
          />
        )}

        {currentView === AppView.EmployerDashboard && user && (userRole === 'employer' || userRole === 'both') && (
          <EmployerDashboardView
            onNavigate={handleNavigate}
            gigs={gigs}
            onAddGig={handleAddGig}
            onLogout={() => {
              logOut(); // This calls the logout from useAuth
              setCurrentView(AppView.Landing);
            }}
          />
        )}

        {currentView === AppView.WorkerBrowse && user && (userRole === 'worker' || userRole === 'both') && (
          <WorkerBrowseView
            onNavigate={handleNavigate}
            fallbackGigs={gigs}
            onLogout={() => {
              logOut();
              setCurrentView(AppView.Landing);
            }}
          />
        )}

        {currentView === AppView.WorkerReliability && user && (userRole === 'worker' || userRole === 'both') && (
          <WorkerReliabilityView
            onNavigate={handleNavigate}
          />
        )}
      </div>

      {/* Role notice (replaces the old blocking alert) */}
      <AnimatePresence>
        {roleNotice && (
          <motion.div
            role="status"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-outline-variant bg-surface p-4 shadow-xl"
          >
            <p className="font-semibold text-on-surface">
              {roleNotice.needed === 'employer' ? 'Hire Staff is for employers' : 'This page is for workers'}
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">
              {roleNotice.error ?? `You are signed in as a ${roleNotice.needed === 'employer' ? 'worker' : 'employer'}. Switch to ${roleNotice.needed} mode to continue.`}
            </p>
            <div className="mt-3 flex gap-2">
              {!roleNotice.error && (
                <button onClick={switchAndGo} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary">
                  Switch to {roleNotice.needed === 'employer' ? 'Employer' : 'Worker'} mode
                </button>
              )}
              <button onClick={() => setRoleNotice(null)} className="rounded-lg px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container">
                {roleNotice.error ? 'OK' : 'Not now'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <LoginPage
            onClose={() => setShowLoginModal(false)}
            defaultRole={selectedRole}
            onLoginSuccess={() => {
              setShowLoginModal(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Role Selector Modal (only for logged-in users) */}
      <AnimatePresence>
        {showSelector && user && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl border border-outline-variant"
            >
              <div className="px-6 py-5 border-b border-outline-variant bg-surface flex justify-between items-center">
                <h3 className="font-sans font-bold text-base text-primary">Switch Workspace</h3>
                <button
                  onClick={() => setShowSelector(false)}
                  className="text-on-surface-variant hover:text-on-surface p-1 rounded-full"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-on-surface-variant">
                  You are currently logged in as <strong>{userRole === 'employer' ? 'Employer' : 'Worker'}</strong>
                </p>
                
                {userRole === 'both' ? (
                  <div className="space-y-3">
                    <button
                      onClick={() => handleNavigate(AppView.WorkerBrowse)}
                      className="w-full p-4 text-left rounded-xl border-2 border-outline-variant hover:border-primary transition-all"
                    >
                      <p className="font-bold">👤 Worker Mode</p>
                      <p className="text-xs text-on-surface-variant">Find and apply for gigs</p>
                    </button>
                    <button
                      onClick={() => handleNavigate(AppView.EmployerDashboard)}
                      className="w-full p-4 text-left rounded-xl border-2 border-outline-variant hover:border-primary transition-all"
                    >
                      <p className="font-bold">🏢 Employer Mode</p>
                      <p className="text-xs text-on-surface-variant">Post gigs and hire workers</p>
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-center text-on-surface-variant">
                    Your account is registered as {userRole === 'employer' ? 'an employer' : 'a worker'}. 
                    Contact support to enable both roles.
                  </p>
                )}

                <button
                  onClick={logOut}
                  className="w-full mt-4 py-2.5 border border-red-300 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}