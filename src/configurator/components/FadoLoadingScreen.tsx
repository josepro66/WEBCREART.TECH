import React from 'react';
import ProductLoadingScreen from './ProductLoadingScreen';

interface FadoLoadingScreenProps {
  isVisible: boolean;
  onComplete?: () => void;
}

const FadoLoadingScreen: React.FC<FadoLoadingScreenProps> = (props) => (
  <ProductLoadingScreen
    {...props}
    name="FADO"
    subtitle="Features: Compact design with 4 assignable knobs and LED indicators."
  />
);

export default FadoLoadingScreen;
