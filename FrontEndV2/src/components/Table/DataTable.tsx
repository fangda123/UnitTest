import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, GripVertical } from 'lucide-react';

/**
 * Component สำหรับแสดงตารางข้อมูลแบบครบครัน
 * มีฟีเจอร์:
 * - Resizable Columns (ปรับขนาดคอลัมน์ได้)
 * - Expandable Rows (ขยายแถวเพื่อดูรายละเอียดได้)
 * - Sorting (เรียงข้อมูล)
 * - Pagination (แบ่งหน้า)
 */

export interface TableColumn {
  key: string;
  label: string;
  width?: number;
  minWidth?: number;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

export interface TableRow {
  id: string | number;
  [key: string]: any;
  expandedContent?: React.ReactNode;
}

interface DataTableProps {
  title: string;
  columns: TableColumn[];
  data: TableRow[];
  expandable?: boolean;
  pagination?: boolean;
  itemsPerPage?: number;
}

const DataTable: React.FC<DataTableProps> = ({
  title,
  columns: initialColumns,
  data,
  expandable = true,
  pagination = true,
  itemsPerPage = 10,
}) => {
  // State สำหรับจัดการคอลัมน์และการ resize
  const [columns, setColumns] = useState(initialColumns);
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  // State สำหรับ resize
  const [resizing, setResizing] = useState<{
    columnKey: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const tableRef = useRef<HTMLDivElement>(null);

  /**
   * ฟังก์ชันสำหรับขยาย/ย่อแถว
   */
  const toggleRowExpansion = (rowId: string | number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);
  };

  /**
   * ฟังก์ชันสำหรับเริ่ม resize column
   */
  const handleResizeStart = (
    e: React.MouseEvent,
    columnKey: string,
    currentWidth: number
  ) => {
    e.preventDefault();
    setResizing({
      columnKey,
      startX: e.clientX,
      startWidth: currentWidth,
    });
  };

  /**
   * ฟังก์ชันสำหรับจัดการ mouse move ขณะ resize
   */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing) return;

      const diff = e.clientX - resizing.startX;
      const newWidth = Math.max(resizing.startWidth + diff, 50); // ความกว้างขั้นต่ำ 50px

      setColumns((prevColumns) =>
        prevColumns.map((col) =>
          col.key === resizing.columnKey
            ? { ...col, width: newWidth }
            : col
        )
      );
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    if (resizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

  /**
   * ฟังก์ชันสำหรับ sort ข้อมูล
   */
  const handleSort = (columnKey: string) => {
    const column = columns.find((col) => col.key === columnKey);
    if (!column?.sortable) return;

    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig?.key === columnKey && sortConfig.direction === 'asc') {
      direction = 'desc';
    }

    setSortConfig({ key: columnKey, direction });
  };

  /**
   * เรียงข้อมูลตาม sort config
   */
  const sortedData = React.useMemo(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  /**
   * คำนวณข้อมูลสำหรับหน้าปัจจุบัน
   */
  const paginatedData = React.useMemo(() => {
    if (!pagination) return sortedData;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, itemsPerPage, pagination]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  return (
    <div className="w-full h-full flex flex-col bg-dark-800 rounded-lg shadow-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-dark-700">
        <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
          <span className="w-1 h-6 bg-primary-500 rounded-full"></span>
          {title}
          <span className="ml-auto text-sm text-gray-400">
            {sortedData.length} รายการ
          </span>
        </h3>
      </div>

      {/* Table Container */}
      <div ref={tableRef} className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-dark-700 sticky top-0 z-10">
            <tr>
              {expandable && (
                <th className="w-12 px-4 py-3 text-left"></th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-300 relative group"
                  style={{
                    width: column.width || 'auto',
                    minWidth: column.minWidth || 100,
                  }}
                >
                  <div
                    className={`flex items-center gap-2 ${
                      column.sortable ? 'cursor-pointer select-none' : ''
                    }`}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    {column.label}
                    {column.sortable && sortConfig?.key === column.key && (
                      <span className="text-primary-500">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>

                  {/* Resize Handle */}
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary-500 transition-colors"
                    onMouseDown={(e) =>
                      handleResizeStart(e, column.key, column.width || 150)
                    }
                  >
                    <div className="h-full w-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <GripVertical className="w-3 h-3 text-gray-400" />
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, rowIndex) => (
              <React.Fragment key={row.id}>
                {/* Main Row */}
                <tr
                  className={`border-b border-dark-700 hover:bg-dark-700/50 transition-colors ${
                    rowIndex % 2 === 0 ? 'bg-dark-800' : 'bg-dark-800/50'
                  }`}
                >
                  {expandable && (
                    <td className="px-4 py-3">
                      {row.expandedContent && (
                        <button
                          onClick={() => toggleRowExpansion(row.id)}
                          className="text-gray-400 hover:text-primary-500 transition-colors"
                        >
                          {expandedRows.has(row.id) ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </button>
                      )}
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={`${row.id}-${column.key}`}
                      className="px-4 py-3 text-sm text-gray-300"
                    >
                      {column.render
                        ? column.render(row[column.key], row)
                        : row[column.key]}
                    </td>
                  ))}
                </tr>

                {/* Expanded Row */}
                {expandable && expandedRows.has(row.id) && row.expandedContent && (
                  <tr className="bg-dark-700/30">
                    <td colSpan={columns.length + 1} className="px-4 py-4">
                      <div className="animate-slide-up">
                        {row.expandedContent}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {/* Empty State */}
        {paginatedData.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>ไม่พบข้อมูล</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="px-6 py-4 border-t border-dark-700 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            หน้า {currentPage} จาก {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded bg-dark-700 text-gray-300 hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ก่อนหน้า
            </button>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded bg-dark-700 text-gray-300 hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ถัดไป
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;

