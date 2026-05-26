import React from 'react';
import FadoConfigurator from '../FadoConfigurator';
import ConfiguratorWithLoading from './ConfiguratorWithLoading';

interface User { name: string; email: string; }
interface Props { className?: string; style?: React.CSSProperties; currentUser: User; onLogout: () => void; }

const FadoWithLoading: React.FC<Props> = ({ className, style, currentUser, onLogout }) => (
  <ConfiguratorWithLoading
    name="FADO"
    subtitle="Features: Compact design with 4 assignable knobs and LED indicators."
    className={className}
    style={style}
  >
    <FadoConfigurator currentUser={currentUser} onLogout={onLogout} />
  </ConfiguratorWithLoading>
);

export default FadoWithLoading;
