import React, { useState, useEffect } from 'react';
import ProductLoadingScreen from './ProductLoadingScreen';

interface ConfiguratorWithLoadingProps {
  name: string;
  subtitle: string;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

const ConfiguratorWithLoading: React.FC<ConfiguratorWithLoadingProps> = ({
  name,
  subtitle,
  duration = 4100,
  className = '',
  style = {},
  children,
}) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  return (
    <div className={className} style={style}>
      <ProductLoadingScreen isVisible={!ready} name={name} subtitle={subtitle} duration={duration} />
      <div style={{ width: '100%', height: '100%', opacity: ready ? 1 : 0 }}>
        {children}
      </div>
    </div>
  );
};

export default ConfiguratorWithLoading;
