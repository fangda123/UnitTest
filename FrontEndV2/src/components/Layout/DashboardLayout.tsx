import type { ReactNode } from 'react';
import DashboardNavbar from './DashboardNavbar';
import Footer from './Footer';

/**
 * Dashboard Layout Component
 * ใช้ Navbar + Content Area + Footer
 */

interface DashboardLayoutProps {
  children: ReactNode;
}

function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      <DashboardNavbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}

export default DashboardLayout;

