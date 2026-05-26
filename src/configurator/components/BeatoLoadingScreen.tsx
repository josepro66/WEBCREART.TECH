import React from 'react';
import ProductLoadingScreen from './ProductLoadingScreen';

interface BeatoLoadingScreenProps {
  isVisible: boolean;
  onComplete?: () => void;
}

const BeatoLoadingScreen: React.FC<BeatoLoadingScreenProps> = (props) => (
  <ProductLoadingScreen
    {...props}
    name="BEATO8"
    subtitle="Features: Metal body, 8 ARCADE buttons, and 4 assignable knobs."
  />
);

export default BeatoLoadingScreen;
