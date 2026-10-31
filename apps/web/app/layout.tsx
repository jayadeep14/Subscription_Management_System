import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'Brightloop | Subscription Management',
  description: 'Manage subscription customers, plans, billing and revenue in one place.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
