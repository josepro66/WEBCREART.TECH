import React, { useLayoutEffect, useRef, lazy, Suspense } from 'react';
import TechBackdrop from './components/ui/TechBackdrop';
import { Routes, Route } from 'react-router-dom';
import Hero from './components/hero/Hero';
import UpcomingProducts from './sections/UpcomingProducts';
import ProductsPage from './components/products/ProductsPage';
import CreartClub from './sections/CreartClub';
import GallerySection from './sections/GallerySection';
import Footer from './components/sections/Footer';
import GlobalParallax from './components/parallax/GlobalParallax';
import FullscreenToggle from './components/ui/FullscreenToggle';
import Navbar from './components/layout/Navbar';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from '@studio-freight/lenis';

// Rutas pesadas cargadas bajo demanda — el configurador (three.js) no debe
// entrar en el bundle inicial de la landing
const ConfiguratorApp = lazy(() => import('./configurator/App'));
const Beato16Info = lazy(() => import('./pages/Beato16Info'));
const Beato8Info = lazy(() => import('./pages/Beato8Info'));
const MixoInfo = lazy(() => import('./pages/MixoInfo'));
const FadoInfo = lazy(() => import('./pages/FadoInfo'));
const KnoboInfo = lazy(() => import('./pages/KnoboInfo'));
const LoopoInfo = lazy(() => import('./pages/LoopoInfo'));
const WavoInfo = lazy(() => import('./pages/WavoInfo'));
const MyConfigsPage = lazy(() => import('./pages/MyConfigsPage'));
const MidiEditorPage = lazy(() => import('./pages/MidiEditorPage'));
const MixoEditorPage = lazy(() => import('./pages/MixoEditorPage'));
const UnifiedEditorPage = lazy(() => import('./pages/UnifiedEditorPage'));

const RouteFallback = () => (
  <div style={{
    position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
    justifyContent: 'center', alignItems: 'center', gap: '1rem',
    background: 'linear-gradient(135deg, #0b1220 0%, #1a1a2e 50%, #16213e 100%)',
    color: '#e5e7eb', fontFamily: 'Inter, Arial, sans-serif', zIndex: 50
  }}>
    <div style={{
      width: 48, height: 48, borderRadius: '50%',
      border: '3px solid #a259ff', borderTopColor: 'transparent',
      animation: 'spin 1s linear infinite'
    }} />
    <p>Cargando…</p>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

gsap.registerPlugin(ScrollTrigger);

// Main layout for the original single-page content
const MainLayout = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const lenis = new Lenis({
      duration: 0.3,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -15 * t)),
      wheelMultiplier: 1,
      touchMultiplier: 1,
    });

    // Use only the gsap ticker — avoids double RAF update
    const onTick = (time: number) => lenis.raf(time * 1000);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    const sections: HTMLElement[] = gsap.utils.toArray('.section-snap');
    
    let snapTriggers = sections.map((section, i) => {
      // El carrusel de productos (índice 2) se excluye del snap para no
      // interferir con la interacción horizontal
      if (i === 2) {
        return null;
      }
      
      return ScrollTrigger.create({
        trigger: section,
        start: "top top",
        snap: {
          snapTo: 1,
          duration: 0.4, // Snap más rápido
          ease: 'power2.out', // Easing más rápido
          delay: 0.05, // Menos delay
          directional: false,
        }
      });
    }).filter(Boolean);

    return () => {
      gsap.ticker.remove(onTick);
      lenis.destroy();
      snapTriggers.forEach(trigger => trigger?.kill());
    };
  }, []);

  return (
    <div className="relative text-white">
      <GlobalParallax />
      <TechBackdrop />
      {/* Noise overlay for subtle texture on top of the starfield */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-21st-noise mix-blend-overlay opacity-40" />
      </div>
      <Navbar />
      <FullscreenToggle />
      <div ref={containerRef}>
        {/* Orden del home igual a crearttech.com: Hero → Próximos → Productos → Galería → Contacto */}
        <section id="inicio" className="section-snap relative h-screen w-full overflow-hidden"><Hero /></section>
        <section id="proximos" className="section-snap relative min-h-screen w-full"><UpcomingProducts /></section>
        <section id="productos" className="section-snap relative h-screen w-full overflow-hidden"><ProductsPage /></section>
        <section id="club" className="section-snap relative min-h-screen md:h-screen w-full overflow-hidden"><CreartClub /></section>
        <section id="galeria" className="section-snap relative h-screen w-full overflow-hidden"><GallerySection /></section>
        <section id="contacto" className="section-snap relative h-screen w-full overflow-hidden"><Footer /></section>
      </div>
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<MainLayout />} />
        <Route path="/configurator" element={<ConfiguratorApp />} />
        <Route path="/beato16info" element={<Beato16Info />} />
        <Route path="/beato8info" element={<Beato8Info />} />
        <Route path="/mixoinfo" element={<MixoInfo />} />
        <Route path="/fadoinfo" element={<FadoInfo />} />
        <Route path="/knoboinfo" element={<KnoboInfo />} />
        <Route path="/loopoinfo" element={<LoopoInfo />} />
        <Route path="/wavoinfo" element={<WavoInfo />} />
        <Route path="/mis-configuraciones" element={<MyConfigsPage />} />
        <Route path="/editor" element={<UnifiedEditorPage />} />
        <Route path="/editor-mixo" element={<MixoEditorPage />} />
        {/* Rutas antiguas: redirigen al editor unificado */}
        <Route path="/editor-midi" element={<UnifiedEditorPage />} />
        <Route path="/editor-wavo" element={<UnifiedEditorPage />} />
        <Route path="/editor-midi-clasico" element={<MidiEditorPage />} />
        <Route path="*" element={<MainLayout />} />
      </Routes>
    </Suspense>
  );
}

export default App;
