import type { ReactNode } from 'react';
import DashboardNavbar from './DashboardNavbar';

/**
 * Dashboard Layout Component
 * ใช้ Navbar + Content Area
 */

interface DashboardLayoutProps {
  children: ReactNode;
}

function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-dark-900">
      <DashboardNavbar />
      <main className="min-h-[calc(100vh-64px)]">
        {children}
      </main>
    </div>
  );
}

export default DashboardLayout;

