import React, { useState, useEffect, Suspense, useRef } from 'react';
import SkeletonLoader from './components/SkeletonLoader';
import ErrorBoundary from './components/ErrorBoundary';
import LoginPage from './LoginPage';
import { usePrefetch } from './hooks/usePrefetch';
import { useAuth } from '../auth/AuthContext';
import UserConfigSync from '../auth/UserConfigSync';
import SaveConfigButton from '../auth/SaveConfigButton';

// Imports lazy para componentes pesados
import {
  PagoFinalizado,
  ConfiguratorWrapper
} from './lazy/components';

// Imports para componentes con pantallas de carga específicas
import Beato8WithLoading from './components/Beato8WithLoading';
import Beato16WithLoading from './components/Beato16WithLoading';
import KnoboWithLoading from './components/KnoboWithLoading';
import MixoWithLoading from './components/MixoWithLoading';
import LoopoWithLoading from './components/LoopoWithLoading';
import FadoWithLoading from './components/FadoWithLoading';
import WavoWithLoading from './components/WavoWithLoading';
import { PRODUCT_IDENTITY, type ProductId } from './productIdentity';


interface User {
  name: string;
  email: string;
}

function App() {
  const [currentProduct, setCurrentProduct] = useState<'beato8' | 'knobo' | 'mixo' | 'beato16' | 'loopo' | 'fado' | 'wavo'>('beato8');
  const [displayedProduct, setDisplayedProduct] = useState<'beato8' | 'knobo' | 'mixo' | 'beato16' | 'loopo' | 'fado' | 'wavo'>('beato8');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showPaymentResult, setShowPaymentResult] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const { user: fbUser, loading: authLoading, signOut, resendVerification } = useAuth();
  const currentUser: User | null = fbUser
    ? { name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuario', email: fbUser.email || '' }
    : null;
  const [isLoading, setIsLoading] = useState(true);
  const [verificationSent, setVerificationSent] = useState(false);
  const { prefetchOnHover, prefetchOnIntersection } = usePrefetch();
  
  // Ref para el botón de configurar (para prefetch en viewport)
  const configButtonRef = useRef<HTMLButtonElement>(null);

  // Verificar si hay un usuario logueado al cargar la app y leer parámetros URL
  useEffect(() => {
    // Base oscura coherente con el StarfieldBackground (antes: imagen fondo.jpg)
    const bg = '#020308';
    document.documentElement.style.backgroundColor = bg;
    document.body.style.backgroundColor = bg;
    return () => {
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
    };
  }, []);

  useEffect(() => {
    // Verificar parámetros de URL al cargar
    const urlParams = new URLSearchParams(window.location.search);
    const productParam = urlParams.get('product');
    if (productParam && ['beato8', 'knobo', 'mixo', 'beato16', 'loopo', 'fado', 'wavo'].includes(productParam)) {
      setCurrentProduct(productParam as any);
      setDisplayedProduct(productParam as any);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (_user: User) => {
    // Firebase Auth maneja el estado vía onAuthStateChanged
  };

  const handleLogout = async () => {
    try { await signOut(); } catch { /* ignore */ }
  };

  // Verificar si estamos en la página de pago finalizado
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasPaymentParams = urlParams.has('referenceCode') || urlParams.has('reference_sale') || 
                            urlParams.has('status') || urlParams.has('state_pol');
    
    if (hasPaymentParams) {
      setShowPaymentResult(true);
      setPaymentData({
        referenceCode: urlParams.get('referenceCode') || urlParams.get('reference_sale'),
        status: urlParams.get('status') || urlParams.get('state_pol'),
        amount: urlParams.get('amount') || urlParams.get('value'),
        currency: urlParams.get('currency'),
        description: urlParams.get('description'),
        transactionId: urlParams.get('transaction_id') || urlParams.get('transactionId')
      });
    }
  }, []);

  // Detección de móvil y orientación
  useEffect(() => {
    const checkDeviceAndOrientation = () => {
      const userAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const screenSize = window.innerWidth <= 768;
      setIsMobile(userAgent || screenSize);
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    
    checkDeviceAndOrientation();
    window.addEventListener('resize', checkDeviceAndOrientation);
    window.addEventListener('orientationchange', checkDeviceAndOrientation);
    
    return () => {
      window.removeEventListener('resize', checkDeviceAndOrientation);
      window.removeEventListener('orientationchange', checkDeviceAndOrientation);
    };
  }, []);

  // Prefetch del configurador cuando el botón entra en viewport
  useEffect(() => {
    if (configButtonRef.current) {
      prefetchOnIntersection(() => import('./components/Beato8WithLoading'), configButtonRef.current);
    }
  }, [prefetchOnIntersection]);

  // Escuchar evento personalizado para cambiar producto
  useEffect(() => {
    const handleSetProduct = (event: CustomEvent) => {
      const product = event.detail;
      if (['beato8', 'knobo', 'mixo', 'beato16', 'loopo', 'fado', 'wavo'].includes(product)) {
        setIsTransitioning(true);
        setCurrentProduct(product as any);
        setTimeout(() => {
          setDisplayedProduct(product as any);
          setIsTransitioning(false);
        }, 320);
      }
    };

    window.addEventListener('setProduct', handleSetProduct as EventListener);
    
    return () => {
      window.removeEventListener('setProduct', handleSetProduct as EventListener);
    };
  }, []);

  const handleProductChange = (product: 'beato8' | 'knobo' | 'mixo' | 'beato16' | 'loopo' | 'fado' | 'wavo') => {
    if (product === currentProduct) return;
    setIsTransitioning(true);
    setCurrentProduct(product);
    setTimeout(() => {
      setDisplayedProduct(product);
      setIsTransitioning(false);
    }, 320);
  };

  // Función para prefetch específico según el producto
  const handleProductHover = (product: 'beato8' | 'knobo' | 'mixo' | 'beato16' | 'loopo' | 'fado' | 'wavo') => {
    const lazyImports = {
      beato8: () => import('./components/Beato8WithLoading'),
      beato16: () => import('./components/Beato16WithLoading'),
      knobo: () => import('./components/KnoboWithLoading'),
      mixo: () => import('./components/MixoWithLoading'),
      loopo: () => import('./components/LoopoWithLoading'),
      fado: () => import('./components/FadoWithLoading'),
      wavo: () => import('./components/WavoWithLoading')
    };
    
    prefetchOnHover(lazyImports[product as any], {} as React.MouseEvent);
  };

  const menuItems = [
    { id: 'beato8' as ProductId, icon: 'textures/beato.png' },
    { id: 'beato16' as ProductId, icon: 'textures/beato16.png' },
    { id: 'knobo' as ProductId, icon: 'textures/knobo.png' },
    { id: 'mixo' as ProductId, icon: 'textures/mixo.png' },
    { id: 'loopo' as ProductId, icon: 'textures/loopo.png' },
    { id: 'fado' as ProductId, icon: 'textures/fado.png' },
    { id: 'wavo' as ProductId, icon: 'textures/wavo.png' },
  ];

  // Mostrar loading mientras se verifica el usuario
  if (isLoading || authLoading) {
    return (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'linear-gradient(135deg, #0b1220 0%, #1a1a2e 50%, #16213e 100%)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'white',
          fontFamily: 'Arial, sans-serif'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div 
            style={{
              width: '50px',
              height: '50px',
              border: '3px solid #a259ff',
              borderTop: '3px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }}
          />
          <p style={{ fontSize: '1.2rem', color: '#e5e7eb' }}>Cargando...</p>
        </div>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  // Si no hay usuario logueado, mostrar página de login
  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Si estamos en la página de pago finalizado, mostrar solo esa página con lazy loading
  if (showPaymentResult) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<SkeletonLoader type="payment" />}>
          <PagoFinalizado />
        </Suspense>
      </ErrorBoundary>
    );
  }

  const showVerifyBanner = !!fbUser && !fbUser.emailVerified && fbUser.providerData[0]?.providerId === 'password';

  return (
    <div className={`App ${isMobile ? 'mobile-device' : ''}`}>
      <UserConfigSync />
      <SaveConfigButton product={displayedProduct} />
      {showVerifyBanner && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
            color: 'white',
            padding: '8px 16px',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <span>📧 Verifica tu email para guardar tus configuraciones — revisa <b>{fbUser?.email}</b></span>
          <button
            onClick={async () => {
              try { await resendVerification(); setVerificationSent(true); } catch { /* ignore */ }
            }}
            disabled={verificationSent}
            style={{
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: 8,
              padding: '4px 10px',
              color: 'white',
              cursor: verificationSent ? 'default' : 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {verificationSent ? '✓ Email reenviado' : 'Reenviar email'}
          </button>
        </div>
      )}

      {/* Pantalla de rotación para móviles */}
      {isMobile && !isLandscape && (
        <div className="rotate-screen-overlay">
          <div className="rotate-screen-content">
            <div className="rotate-icon">📱</div>
            <h2>Gira tu dispositivo</h2>
            <p>Para una mejor experiencia, usa el configurador en modo horizontal</p>
            <div className="rotate-arrow">↻</div>
          </div>
        </div>
      )}

      {/* Navigation Menu — cards con identidad por producto */}
      <div className="product-menu">
        {menuItems.map((item) => {
          const id = PRODUCT_IDENTITY[item.id];
          const isActive = currentProduct === item.id;
          return (
            <button
              className="product-menu-item"
              key={item.id}
              onClick={() => handleProductChange(item.id)}
              ref={item.id === 'beato8' ? configButtonRef : undefined}
              data-active={isActive ? 'true' : 'false'}
              style={{
                background: isActive
                  ? `linear-gradient(135deg, ${id.accent}26 0%, ${id.accent}10 100%)`
                  : 'rgba(14, 14, 16, 0.55)',
                border: `1px solid ${isActive ? id.accent : 'rgba(255, 255, 255, 0.08)'}`,
                color: isActive ? id.accent : '#F2F1ED',
                boxShadow: isActive
                  ? `0 0 0 1px ${id.accent}40, 0 4px 12px -4px rgba(0,0,0,0.5), inset 0 1px 0 ${id.accent}30`
                  : '0 4px 12px -4px rgba(0,0,0,0.5)',
              }}
              onMouseEnter={(e) => {
                handleProductHover(item.id);
                if (!isActive) {
                  e.currentTarget.style.borderColor = `${id.accent}80`;
                  e.currentTarget.style.background = `linear-gradient(135deg, ${id.accent}15 0%, rgba(14,14,16,0.7) 100%)`;
                  e.currentTarget.style.transform = 'translateX(4px)';
                  e.currentTarget.style.boxShadow = `0 4px 12px -4px rgba(0,0,0,0.5), 0 0 0 1px ${id.accent}30`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.background = 'rgba(14, 14, 16, 0.55)';
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px -4px rgba(0,0,0,0.5)';
                }
              }}
            >
              {/* Indicador vertical de activo */}
              {isActive && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '20%',
                    bottom: '20%',
                    width: 3,
                    background: id.gradient,
                    borderRadius: '0 2px 2px 0',
                    boxShadow: 'none',
                  }}
                />
              )}

              <img
                src={item.icon}
                alt={id.name}
                style={{
                  width: 36,
                  height: 36,
                  objectFit: 'contain',
                  filter: isActive
                    ? 'none'
                    : 'grayscale(0.25) opacity(0.85)',
                  transition: 'filter 0.25s ease',
                }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />

              <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    fontFamily: "'Orbitron', 'Space Grotesk', sans-serif",
                    color: isActive ? id.accent : '#F2F1ED',
                    textShadow: 'none',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {id.name}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: isActive ? '#F2F1ED' : 'rgba(242, 241, 237, 0.55)',
                    letterSpacing: '0.02em',
                    marginTop: 2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {id.tagline}
                </div>
              </div>

              {id.badge && (
                <span
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    fontSize: 7,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                    background: id.gradient,
                    color: '#0E0E10',
                    padding: '2px 5px',
                    borderRadius: 3,
                    boxShadow: '0 2px 6px -1px rgba(0,0,0,0.4)',
                  }}
                >
                  {id.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Content con lazy loading */}
      <main className="canvas-wrap">
        <ErrorBoundary>
          <Suspense fallback={<SkeletonLoader type="configurator" />}>
            <ConfiguratorWrapper>
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  opacity: isTransitioning ? 0 : 1,
                  transition: 'opacity 0.32s ease',
                  willChange: 'opacity'
                }}
              >
                {displayedProduct === 'beato8' && <Beato8WithLoading currentUser={currentUser} onLogout={handleLogout} />}
                {displayedProduct === 'knobo' && <KnoboWithLoading currentUser={currentUser} onLogout={handleLogout} />}
                {displayedProduct === 'mixo' && <MixoWithLoading currentUser={currentUser} onLogout={handleLogout} />}
                {displayedProduct === 'beato16' && <Beato16WithLoading currentUser={currentUser} onLogout={handleLogout} />}
                {displayedProduct === 'loopo' && <LoopoWithLoading currentUser={currentUser} onLogout={handleLogout} />}
                {displayedProduct === 'fado' && <FadoWithLoading currentUser={currentUser} onLogout={handleLogout} />}
                {displayedProduct === 'wavo' && <WavoWithLoading currentUser={currentUser} onLogout={handleLogout} />}
              </div>
            </ConfiguratorWrapper>
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default App;