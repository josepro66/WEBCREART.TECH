import React from 'react';
import ProductLoadingScreen from './ProductLoadingScreen';

interface MixoLoadingScreenProps {
  isVisible: boolean;
  onComplete?: () => void;
}

const MixoLoadingScreen: React.FC<MixoLoadingScreenProps> = (props) => (
  <ProductLoadingScreen
    {...props}
    name="MIXO"
    subtitle="Features: Mix controller with 8 assignable faders and LED indicators."
  />
);

export default MixoLoadingScreen;
