import React from 'react';
import LoopoConfigurator from '../LoopoConfigurator';
import ConfiguratorWithLoading from './ConfiguratorWithLoading';

interface User { name: string; email: string; }
interface Props { className?: string; style?: React.CSSProperties; currentUser: User; onLogout: () => void; }

const LoopoWithLoading: React.FC<Props> = ({ className, style, currentUser, onLogout }) => (
  <ConfiguratorWithLoading
    name="LOOPO"
    subtitle="Features: Loop controller with 4 assignable buttons and LED indicators."
    className={className}
    style={style}
  >
    <LoopoConfigurator currentUser={currentUser} onLogout={onLogout} />
  </ConfiguratorWithLoading>
);

export default LoopoWithLoading;
