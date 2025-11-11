import React, { useState, useEffect } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import { Trash2 } from 'lucide-react';
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

// Default layout configuration - ใช้ widget.id แทน index
const getDefaultLayout = (widgetsList: DashboardWidget[]): { [key: string]: Layout[] } => {
    const defaultLayouts: Layout[] = [];
    widgetsList.forEach((widget, i) => {
      if (i < 4) {
        // แถวแรก 2x2
        defaultLayouts.push({
          i: widget.id, // ใช้ widget.id แทน widget-${i}
          x: (i % 2) * 6,
          y: Math.floor(i / 2) * 4,
          w: 6,
          h: 4,
          minW: 3,
          minH: 3,
        });
      } else if (i === 4) {
        // แถวที่ 3 - full width
        defaultLayouts.push({
          i: widget.id,
          x: 0,
          y: 8,
          w: 12,
          h: 5,
          minW: 6,
          minH: 4,
        });
      } else {
        // แถวถัดไป - full width
        const prevY = defaultLayouts[defaultLayouts.length - 1]?.y || 8;
        const prevH = defaultLayouts[defaultLayouts.length - 1]?.h || 5;
        defaultLayouts.push({
          i: widget.id,
          x: 0,
          y: prevY + prevH,
          w: 12,
          h: 6,
          minW: 6,
          minH: 4,
        });
      }
    });
  return { lg: defaultLayouts };
};

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  widgets,
  onLayoutChange,
}) => {
  // State สำหรับเก็บ widgets ที่แสดงอยู่
  const [visibleWidgets, setVisibleWidgets] = useState<DashboardWidget[]>(widgets);
  
  // State สำหรับเก็บ selected widgets
  const [selectedWidgets, setSelectedWidgets] = useState<Set<string>>(new Set());

  // Update visible widgets และ layout เมื่อ widgets prop เปลี่ยน
  useEffect(() => {
    setVisibleWidgets(widgets);
    // อัปเดต layout เมื่อ widgets prop เปลี่ยน
    setLayouts(getDefaultLayout(widgets));
  }, [widgets]);

  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>(() => 
    getDefaultLayout(widgets)
  );

  // อัปเดต layout เมื่อ visibleWidgets เปลี่ยน (เมื่อมีการลบ widget)
  useEffect(() => {
    const visibleWidgetIds = visibleWidgets.map(w => w.id);
    setLayouts(prevLayouts => {
      const currentLayouts = prevLayouts.lg || [];
      
      // กรอง layout ที่ยังมี widget อยู่ (ใช้ widget.id)
      const filteredLayouts = currentLayouts.filter(layout => 
        visibleWidgetIds.includes(layout.i)
      );
      
      // สร้าง layout ใหม่สำหรับ widget ที่ยังไม่มี layout
      const existingIds = new Set(filteredLayouts.map(l => l.i));
      const newLayouts: Layout[] = [...filteredLayouts];
      
      visibleWidgets.forEach((widget, idx) => {
        if (!existingIds.has(widget.id)) {
          // หา y position ที่เหมาะสม
          const maxY = newLayouts.length > 0 
            ? Math.max(...newLayouts.map(l => l.y + l.h))
            : 0;
          
          newLayouts.push({
            i: widget.id, // ใช้ widget.id
            x: idx < 4 ? (idx % 2) * 6 : 0,
            y: maxY,
            w: idx < 4 ? 6 : 12,
            h: idx < 4 ? 4 : 5,
            minW: 3,
            minH: 3,
          });
        }
      });
      
      // เรียงลำดับ layout ตามลำดับของ visibleWidgets
      const sortedLayouts = visibleWidgets
        .map(widget => newLayouts.find(l => l.i === widget.id))
        .filter((l): l is Layout => l !== undefined);
      
      return { lg: sortedLayouts };
    });
  }, [visibleWidgets]);

  const handleLayoutChange = (currentLayout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
    setLayouts(allLayouts);
    if (onLayoutChange) {
      onLayoutChange(currentLayout);
    }
  };

  // Toggle selection ของ widget
  const toggleWidgetSelection = (widgetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedWidgets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(widgetId)) {
        newSet.delete(widgetId);
      } else {
        newSet.add(widgetId);
      }
      return newSet;
    });
  };

  // ลบ widgets ที่เลือก
  const deleteSelectedWidgets = () => {
    setVisibleWidgets(prev => prev.filter(widget => !selectedWidgets.has(widget.id)));
    setSelectedWidgets(new Set());
  };

  // ลบ widget เดียว
  const deleteWidget = (widgetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('คุณต้องการลบ widget นี้หรือไม่?')) {
      setVisibleWidgets(prev => prev.filter(widget => widget.id !== widgetId));
      setSelectedWidgets(prev => {
        const newSet = new Set(prev);
        newSet.delete(widgetId);
        return newSet;
      });
    }
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedWidgets(new Set());
  };

  return (
    <div className="p-4">
      {/* Delete Button - แสดงเมื่อมี widget ที่เลือก */}
      {selectedWidgets.size > 0 && (
        <div className="mb-4 flex items-center justify-between bg-dark-800/50 border border-dark-700 rounded-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-300">
              {selectedWidgets.size} widget{selectedWidgets.size > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={clearSelection}
              className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
            >
              Clear selection
            </button>
          </div>
          <button
            onClick={deleteSelectedWidgets}
            className="flex items-center gap-2 px-4 py-2 bg-danger/20 hover:bg-danger/30 text-danger rounded-lg transition-all duration-200 border border-danger/30 hover:border-danger/50"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm font-medium">Delete Selected</span>
          </button>
        </div>
      )}

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
        {visibleWidgets.map((widget, index) => {
          const isSelected = selectedWidgets.has(widget.id);
          return (
            <div
              key={widget.id}
              className={`bg-dark-800 rounded-lg shadow-xl overflow-hidden border transition-all duration-300 ${
                isSelected
                  ? 'border-primary-500 ring-2 ring-primary-500/50'
                  : 'border-dark-700 hover:border-primary-500/50'
              }`}
            >
              {/* Widget Header - Drag Handle */}
              <div className="group cursor-move bg-dark-700/50 px-4 py-2 border-b border-dark-700 flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex gap-1">
                    <div
                      onClick={(e) => toggleWidgetSelection(widget.id, e)}
                      className={`w-3 h-3 rounded-full cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'bg-danger ring-2 ring-danger/50 ring-offset-1 ring-offset-dark-800'
                          : 'bg-danger hover:bg-danger/80'
                      }`}
                      title={isSelected ? 'Click to deselect' : 'Click to select'}
                    ></div>
                    <div className="w-3 h-3 rounded-full bg-warning"></div>
                    <div className="w-3 h-3 rounded-full bg-success"></div>
                  </div>
                  <span className="text-xs text-gray-400 ml-2">
                    Drag to move • Resize from corners
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isSelected && (
                    <div className="px-2 py-1 bg-primary-500/20 text-primary-400 text-xs rounded">
                      Selected
                    </div>
                  )}
                  {/* ปุ่มลบ Widget */}
                  <button
                    onClick={(e) => deleteWidget(widget.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-danger/20 text-danger hover:text-danger rounded transition-all duration-200"
                    title="ลบ widget"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="text-xs text-gray-500">
                    #{index + 1}
                  </div>
                </div>
              </div>

              {/* Widget Content */}
              <div className="h-[calc(100%-44px)] overflow-hidden">
                {widget.component}
              </div>
            </div>
          );
        })}
      </ResponsiveGridLayout>
    </div>
  );
};

export default DashboardLayout;

