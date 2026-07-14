import React from 'react';
import BeatoConfigurator from '../BeatoConfigurator';
import ConfiguratorWithLoading from './ConfiguratorWithLoading';

interface User { name: string; email: string; }
interface Props { className?: string; style?: React.CSSProperties; currentUser: User; onLogout: () => void; }

const Beato8WithLoading: React.FC<Props> = ({ className, style, currentUser, onLogout }) => (
  <ConfiguratorWithLoading
    name="BEATO8"
    subtitle="Features: Metal body, 8 ARCADE buttons, and 4 assignable knobs."

    className={className}
    style={style}
  >
    <BeatoConfigurator currentUser={currentUser} onLogout={onLogout} />
  </ConfiguratorWithLoading>
);

export default Beato8WithLoading;
