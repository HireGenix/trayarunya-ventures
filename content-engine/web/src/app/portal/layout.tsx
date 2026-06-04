import { PortalAuthProvider } from '@/lib/portalAuth';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalAuthProvider>{children}</PortalAuthProvider>;
}
