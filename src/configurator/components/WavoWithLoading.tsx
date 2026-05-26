import React from 'react';
import WavoConfigurator from '../WavoConfigurator';
import ConfiguratorWithLoading from './ConfiguratorWithLoading';

interface User { name: string; email: string; }
interface Props { className?: string; style?: React.CSSProperties; currentUser: User; onLogout: () => void; }

const WavoWithLoading: React.FC<Props> = ({ className, style, currentUser, onLogout }) => (
  <ConfiguratorWithLoading
    name="WAVO"
    subtitle="Features: Analog hybrid synthesizer with step sequencer and custom keybed."
    className={className}
    style={style}
  >
    <WavoConfigurator currentUser={currentUser} onLogout={onLogout} />
  </ConfiguratorWithLoading>
);

export default WavoWithLoading;
