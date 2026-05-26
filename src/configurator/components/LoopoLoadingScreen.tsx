import React from 'react';
import ProductLoadingScreen from './ProductLoadingScreen';

interface LoopoLoadingScreenProps {
  isVisible: boolean;
  onComplete?: () => void;
}

const LoopoLoadingScreen: React.FC<LoopoLoadingScreenProps> = (props) => (
  <ProductLoadingScreen
    {...props}
    name="LOOPO"
    subtitle="Features: Loop controller with 4 assignable buttons and LED indicators."
  />
);

export default LoopoLoadingScreen;
