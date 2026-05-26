import React from 'react';
import ProductLoadingScreen from './ProductLoadingScreen';

interface Beato16LoadingScreenProps {
  isVisible: boolean;
  onComplete?: () => void;
}

const Beato16LoadingScreen: React.FC<Beato16LoadingScreenProps> = (props) => (
  <ProductLoadingScreen
    {...props}
    name="BEATO16"
    subtitle="Features: Metal body, 16 ARCADE buttons, and 4 assignable knobs."
  />
);

export default Beato16LoadingScreen;
