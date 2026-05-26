import React from 'react';
import MixoConfigurator from '../MixoConfigurator';
import ConfiguratorWithLoading from './ConfiguratorWithLoading';

interface User { name: string; email: string; }
interface Props { className?: string; style?: React.CSSProperties; currentUser: User; onLogout: () => void; }

const MixoWithLoading: React.FC<Props> = ({ className, style, currentUser, onLogout }) => (
  <ConfiguratorWithLoading
    name="MIXO"
    subtitle="Features: Mix controller with 8 assignable faders and LED indicators."
    className={className}
    style={style}
  >
    <MixoConfigurator currentUser={currentUser} onLogout={onLogout} />
  </ConfiguratorWithLoading>
);

export default MixoWithLoading;
