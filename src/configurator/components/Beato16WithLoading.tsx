import React from 'react';
import Beato16Configurator from '../Beato16Configurator';
import ConfiguratorWithLoading from './ConfiguratorWithLoading';

interface User { name: string; email: string; }
interface Props { className?: string; style?: React.CSSProperties; currentUser: User; onLogout: () => void; }

const Beato16WithLoading: React.FC<Props> = ({ className, style, currentUser, onLogout }) => (
  <ConfiguratorWithLoading
    name="BEATO16"
    subtitle="Features: Metal body, 16 ARCADE buttons, and 4 assignable knobs."
    className={className}
    style={style}
  >
    <Beato16Configurator currentUser={currentUser} onLogout={onLogout} />
  </ConfiguratorWithLoading>
);

export default Beato16WithLoading;
