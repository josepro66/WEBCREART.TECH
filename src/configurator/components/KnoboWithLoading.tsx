import React from 'react';
import KnoboConfigurator from '../KnoboConfigurator';
import ConfiguratorWithLoading from './ConfiguratorWithLoading';

interface User { name: string; email: string; }
interface Props { className?: string; style?: React.CSSProperties; currentUser: User; onLogout: () => void; }

const KnoboWithLoading: React.FC<Props> = ({ className, style, currentUser, onLogout }) => (
  <ConfiguratorWithLoading
    name="KNOBO"
    subtitle="Features: Professional knob controller with 4 assignable knobs and LED feedback."
    className={className}
    style={style}
  >
    <KnoboConfigurator currentUser={currentUser} onLogout={onLogout} />
  </ConfiguratorWithLoading>
);

export default KnoboWithLoading;
