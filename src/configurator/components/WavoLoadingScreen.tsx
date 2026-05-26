import React from 'react';
import ProductLoadingScreen from './ProductLoadingScreen';

interface WavoLoadingScreenProps {
  isVisible: boolean;
  onComplete?: () => void;
}

const WavoLoadingScreen: React.FC<WavoLoadingScreenProps> = (props) => (
  <ProductLoadingScreen
    {...props}
    name="WAVO"
    subtitle="Features: Analog hybrid synthesizer with step sequencer and custom keybed."
  />
);

export default WavoLoadingScreen;
