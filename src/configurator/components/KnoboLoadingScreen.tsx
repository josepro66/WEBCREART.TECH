import React from 'react';
import ProductLoadingScreen from './ProductLoadingScreen';

interface KnoboLoadingScreenProps {
  isVisible: boolean;
  onComplete?: () => void;
}

const KnoboLoadingScreen: React.FC<KnoboLoadingScreenProps> = (props) => (
  <ProductLoadingScreen
    {...props}
    name="KNOBO"
    subtitle="Features: Professional knob controller with 4 assignable knobs and LED feedback."
  />
);

export default KnoboLoadingScreen;
