import React, { useState, Suspense, lazy } from 'react';
import './styles.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { ToastProvider } from './components/Toast';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Code splitting para las vistas principales
const LoginScreen = lazy(() => import('./components/LoginScreen').then(m => ({ default: m.LoginScreen })));
const Sidebar = lazy(() => import('./components/Sidebar').then(m => ({ default: m.Sidebar })));
const DashboardView = lazy(() => import('./components/DashboardView').then(m => ({ default: m.DashboardView })));
const VentaView = lazy(() => import('./components/VentaView').then(m => ({ default: m.VentaView })));
const ReposicionView = lazy(() => import('./components/ReposicionView').then(m => ({ default: m.ReposicionView })));
const ProductosView = lazy(() => import('./components/ProductosView').then(m => ({ default: m.ProductosView })));
const HistorialView = lazy(() => import('./components/HistorialView').then(m => ({ default: m.HistorialView })));
const EstadisticasView = lazy(() => import('./components/EstadisticasView').then(m => ({ default: m.EstadisticasView })));
const NominaView = lazy(() => import('./components/NominaView').then(m => ({ default: m.NominaView })));
const UsuariosView = lazy(() => import('./components/UsuariosView').then(m => ({ default: m.UsuariosView })));

import { SkeletonPage } from './components/Skeleton';

function MainApp() {
  const { currentUser, isAdmin, loading, handleLogout } = useAuth();
  const [view, setView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Global Keyboard Shortcuts
  useKeyboardShortcuts({
    'ctrl+v': () => setView('venta'),
    'ctrl+d': () => setView('dashboard'),
    'escape': () => setSidebarOpen(false),
  }, !!currentUser);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="sc-mono" style={{ color: 'var(--cyan)' }}>Cargando STOCK//CTRL...</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Suspense fallback={<div>Cargando...</div>}>
        <LoginScreen />
      </Suspense>
    );
  }

  return (
    <DataProvider>
      <div className="sc-root" style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 40,
            }}
          />
        )}

        <Suspense fallback={<div style={{ width: 240, borderRight: '1px solid var(--border)' }} />}>
          <div style={{
            position: 'absolute',
            zIndex: 50,
            height: '100%',
            transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.2s ease',
          }} className="sidebar-mobile-wrapper">
            <Sidebar
              view={view}
              setView={(v) => { setView(v); setSidebarOpen(false); }}
              user={currentUser}
              onLogout={handleLogout}
            />
          </div>
          <div className="sc-hide-mobile" style={{ zIndex: 10 }}>
            <Sidebar
              view={view}
              setView={setView}
              user={currentUser}
              onLogout={handleLogout}
            />
          </div>
        </Suspense>

        <main style={{ flex: 1, padding: '24px 28px', maxWidth: 1280, margin: '0 auto', width: '100%', overflowX: 'hidden' }}>
          {/* Mobile Header Toggle */}
          <div className="sc-hide-desktop" style={{ display: 'none', marginBottom: 20 }}>
            <button onClick={() => setSidebarOpen(true)} className="sc-btn" style={{ background: 'var(--panel)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: 6, color: 'var(--text)' }}>
              ☰ Menú
            </button>
          </div>
          
          <Suspense fallback={<SkeletonPage />}>
            {view === 'dashboard' && <DashboardView canSeeCost={isAdmin} />}
            {view === 'venta' && <VentaView />}
            {view === 'reposicion' && <ReposicionView isAdmin={isAdmin} />}
            {view === 'productos' && isAdmin && <ProductosView />}
            {view === 'historial' && <HistorialView />}
            {view === 'estadisticas' && isAdmin && <EstadisticasView />}
            {view === 'nomina' && isAdmin && <NominaView />}
            {view === 'usuarios' && isAdmin && <UsuariosView />}
          </Suspense>
        </main>
        
        {/* Add minimal CSS for sidebar hide-desktop toggle here */}
        <style dangerouslySetInnerHTML={{__html: `
          @media (max-width: 768px) {
            .sc-hide-desktop { display: block !important; }
            .sidebar-mobile-wrapper { position: fixed !important; }
          }
          @media (min-width: 769px) {
            .sidebar-mobile-wrapper { display: none !important; }
          }
        `}} />
      </div>
    </DataProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainApp />
      </ToastProvider>
    </AuthProvider>
  );
}
