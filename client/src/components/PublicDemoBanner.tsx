import { IS_DEMO } from '../config';
import { useAuth } from '../hooks/useAuth';
import DemoBanner from './DemoBanner';

/** The demo banner is for visitors deciding whether to try the demo; hide it once signed in. */
const PublicDemoBanner = () => {
  const { isAuthenticated } = useAuth();
  return IS_DEMO && !isAuthenticated ? <DemoBanner /> : null;
};

export default PublicDemoBanner;
