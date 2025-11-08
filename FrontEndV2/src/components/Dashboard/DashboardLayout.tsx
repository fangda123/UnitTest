import React, { useState } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

/**
 * Dashboard Layout Component
 * รองรับการ Drag & Drop และ Resize แบบ Binance
 * ผู้ใช้สามารถปรับแต่ง layout ได้ตามต้องการ
 */

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardWidget {
  id: string;
  title: string;
  component: React.ReactNode;
}

interface DashboardLayoutProps {
  widgets: DashboardWidget[];
  onLayoutChange?: (layout: Layout[]) => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  widgets,
  onLayoutChange,
}) => {
  // Default layout configuration
  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({
    lg: [
      { i: 'widget-0', x: 0, y: 0, w: 6, h: 4, minW: 3, minH: 3 },
      { i: 'widget-1', x: 6, y: 0, w: 6, h: 4, minW: 3, minH: 3 },
      { i: 'widget-2', x: 0, y: 4, w: 6, h: 4, minW: 3, minH: 3 },
      { i: 'widget-3', x: 6, y: 4, w: 6, h: 4, minW: 3, minH: 3 },
      { i: 'widget-4', x: 0, y: 8, w: 12, h: 5, minW: 6, minH: 4 },
      { i: 'widget-5', x: 0, y: 13, w: 12, h: 6, minW: 6, minH: 4 },
    ],
  });

  const handleLayoutChange = (currentLayout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
    setLayouts(allLayouts);
    if (onLayoutChange) {
      onLayoutChange(currentLayout);
    }
  };

  return (
    <div className="p-4">
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={80}
        onLayoutChange={handleLayoutChange}
        isDraggable={true}
        isResizable={true}
        compactType="vertical"
        preventCollision={false}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        useCSSTransforms={true}
      >
        {widgets.map((widget, index) => (
          <div
            key={`widget-${index}`}
            className="bg-dark-800 rounded-lg shadow-xl overflow-hidden border border-dark-700 hover:border-primary-500/50 transition-all duration-300"
          >
            {/* Widget Header - Drag Handle */}
            <div className="cursor-move bg-dark-700/50 px-4 py-2 border-b border-dark-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-3 h-3 rounded-full bg-danger"></div>
                  <div className="w-3 h-3 rounded-full bg-warning"></div>
                  <div className="w-3 h-3 rounded-full bg-success"></div>
                </div>
                <span className="text-xs text-gray-400 ml-2">
                  Drag to move • Resize from corners
                </span>
              </div>
              <div className="text-xs text-gray-500">
                #{index + 1}
              </div>
            </div>

            {/* Widget Content */}
            <div className="h-[calc(100%-44px)] overflow-hidden">
              {widget.component}
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
};

export default DashboardLayout;

