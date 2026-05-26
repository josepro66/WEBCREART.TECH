import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductLoadingScreenProps {
  isVisible: boolean;
  name: string;
  subtitle: string;
  duration?: number;
  onComplete?: () => void;
}

const ProductLoadingScreen: React.FC<ProductLoadingScreenProps> = ({
  isVisible,
  name,
  subtitle,
  duration = 4100,
  onComplete,
}) => {
  const [progress, setProgress] = useState(0);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (isVisible) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min((elapsed / duration) * 100, 100);
        setProgress(prev => {
          if (Math.abs(prev - newProgress) >= 1 || newProgress >= 100) return newProgress;
          return prev;
        });
        if (newProgress >= 100) {
          clearInterval(interval);
          onComplete?.();
        }
      }, 100);
      return () => clearInterval(interval);
    } else {
      setProgress(0);
    }
  }, [isVisible, startTime, duration]);

  return (
    <AnimatePresence>
      {isVisible && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0,
            width: '100vw', height: '100vh',
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center',
            zIndex: 9999, color: 'white',
            fontFamily: 'Arial, sans-serif', overflow: 'hidden',
          }}
        >
          {/* Background image */}
          <img
            src={`${import.meta.env.BASE_URL}textures/carga.jpg`}
            alt=""
            aria-hidden="true"
            style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%', objectFit: 'cover', zIndex: -2,
            }}
          />

          {/* Overlay */}
          <div style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.35)', zIndex: -1,
          }} />

          {/* Product name */}
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{
              fontSize: '34px', fontWeight: 'bold', marginBottom: '20px',
              color: '#00FFFF', letterSpacing: '4px', position: 'relative', zIndex: 1,
              textShadow: '0 0 20px #00FFFF, 0 0 40px #00FFFF, 0 0 60px #00FFFF',
            }}
          >
            {name}
          </motion.div>

          {/* Subtitle */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
            style={{
              fontSize: '18px', fontWeight: 'bold', marginBottom: '40px',
              color: '#FFFFFF', textAlign: 'center', maxWidth: '80%',
              textShadow: '0 0 15px #FFFFFF, 0 0 30px #FFFFFF',
              position: 'relative', zIndex: 1,
            }}
          >
            {subtitle}
          </motion.div>

          {/* Spinner */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            style={{
              width: '100px', height: '100px',
              border: '6px solid rgba(0,255,255,0.3)', borderTop: '6px solid #00FFFF',
              borderRadius: '50%', marginBottom: '40px', position: 'relative', zIndex: 1,
              boxShadow: '0 0 30px rgba(0,255,255,0.8), 0 0 60px rgba(0,255,255,0.4)',
            }}
          />

          {/* Progress text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            style={{
              fontSize: '20px', fontWeight: 'bold', textAlign: 'center',
              marginBottom: '20px', color: '#00FFFF', position: 'relative', zIndex: 1,
              textShadow: '0 0 15px #00FFFF, 0 0 30px #00FFFF',
            }}
          >
            Cargando {name}... {Math.round(progress)}%
          </motion.div>

          {/* Ready message */}
          {progress >= 100 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              style={{
                fontSize: '18px', color: '#00FF80', fontWeight: 'bold',
                marginBottom: '30px', position: 'relative', zIndex: 1,
                textShadow: '0 0 15px #00FF80, 0 0 30px #00FF80',
              }}
            >
              ¡{name} listo para configurar!
            </motion.div>
          )}

          {/* Progress bar */}
          <motion.div
            style={{
              width: '400px', height: '8px',
              backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '4px',
              overflow: 'hidden', marginBottom: '40px',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
              position: 'relative', zIndex: 1,
            }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1, ease: 'linear' }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #00FFFF, #00CCFF, #00FFFF)',
                borderRadius: '4px', backgroundSize: '200% 100%',
                animation: 'shimmer 2s infinite',
                boxShadow: '0 0 20px rgba(0,255,255,0.8), 0 0 40px rgba(0,255,255,0.4)',
              }}
            />
          </motion.div>

          {/* Dots */}
          <motion.div style={{ display: 'flex', gap: '12px', marginTop: '20px', position: 'relative', zIndex: 1 }}>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
                style={{
                  width: '12px', height: '12px', borderRadius: '50%',
                  backgroundColor: '#00FFFF',
                  boxShadow: '0 0 15px rgba(0,255,255,0.8), 0 0 30px rgba(0,255,255,0.4)',
                }}
              />
            ))}
          </motion.div>

          <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ProductLoadingScreen;
