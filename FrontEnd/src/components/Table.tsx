import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { TradeHistory } from '../data/mockData';

interface Column {
  key: keyof TradeHistory | 'actions';
  label: string;
  width: number;
  minWidth?: number;
}

interface TableProps {
  data: TradeHistory[];
  title?: string;
}

/**
 * Advanced Table Component
 * - Resizable Columns: ลากขอบคอลัมน์เพื่อปรับขนาด
 * - Expandable Rows: คลิกแถวเพื่อดูรายละเอียดเพิ่มเติม
 * - Responsive Design: ปรับตัวตามขนาดหน้าจอ
 */
export const Table: React.FC<TableProps> = ({ data, title = 'ตารางข้อมูล' }) => {
  const [columns, setColumns] = useState<Column[]>([
    { key: 'date', label: 'วันที่/เวลา', width: 150, minWidth: 120 },
    { key: 'pair', label: 'คู่เทรด', width: 100, minWidth: 80 },
    { key: 'type', label: 'ประเภท', width: 80, minWidth: 70 },
    { key: 'price', label: 'ราคา', width: 120, minWidth: 100 },
    { key: 'amount', label: 'จำนวน', width: 100, minWidth: 80 },
    { key: 'total', label: 'มูลค่ารวม', width: 120, minWidth: 100 },
    { key: 'fee', label: 'ค่าธรรมเนียม', width: 100, minWidth: 80 },
    { key: 'status', label: 'สถานะ', width: 100, minWidth: 80 },
  ]);

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [resizingColumn, setResizingColumn] = useState<number | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);

  // จัดการการ Resize คอลัมน์
  const handleMouseDown = (e: React.MouseEvent, columnIndex: number) => {
    e.preventDefault();
    setResizingColumn(columnIndex);
    setStartX(e.clientX);
    setStartWidth(columns[columnIndex].width);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizingColumn === null) return;

      const diff = e.clientX - startX;
      const newWidth = Math.max(
        columns[resizingColumn].minWidth || 50,
        startWidth + diff
      );

      setColumns(prev => {
        const newColumns = [...prev];
        newColumns[resizingColumn] = {
          ...newColumns[resizingColumn],
          width: newWidth
        };
        return newColumns;
      });
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    if (resizingColumn !== null) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn, startX, startWidth, columns]);

  // Toggle การขยายแถว
  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Format ข้อมูลตามประเภท
  const formatCellValue = (key: keyof TradeHistory, value: any) => {
    switch (key) {
      case 'type':
        return (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            value === 'BUY' 
              ? 'bg-binance-green/10 text-binance-green' 
              : 'bg-binance-red/10 text-binance-red'
          }`}>
            {value}
          </span>
        );
      case 'price':
      case 'total':
      case 'fee':
        return (
          <span className="font-mono">
            ${typeof value === 'number' ? value.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }) : value}
          </span>
        );
      case 'amount':
        return <span className="font-mono">{value}</span>;
      case 'status':
        return (
          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
            value === 'completed' 
              ? 'bg-binance-green/10 text-binance-green' 
              : value === 'pending'
              ? 'bg-binance-yellow/10 text-binance-yellow'
              : 'bg-binance-textSecondary/10 text-binance-textSecondary'
          }`}>
            {value === 'completed' ? 'Done' : value === 'pending' ? 'Pending' : 'Cancelled'}
          </span>
        );
      default:
        return value;
    }
  };

  return (
    <div className="bg-binance-card border border-binance-border rounded h-full flex flex-col p-4">
      <h3 className="text-sm font-semibold text-binance-text mb-3">{title}</h3>
      
      <div ref={tableRef} className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-binance-bg z-10">
            <tr>
              <th className="w-8 p-2 text-left border-b border-binance-border">
                {/* Expand column */}
              </th>
              {columns.map((column, index) => (
                <th
                  key={column.key}
                  className="p-2 text-left border-b border-binance-border relative group"
                  style={{ width: column.width }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-binance-textSecondary uppercase">
                      {column.label}
                    </span>
                  </div>
                  
                  {/* Resize Handle */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-binance-yellow group-hover:bg-binance-yellow/50 transition-colors"
                    onMouseDown={(e) => handleMouseDown(e, index)}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const isExpanded = expandedRows.has(row.id);
              return (
                <React.Fragment key={row.id}>
                  <tr 
                    className="border-b border-binance-border hover:bg-binance-bg transition-colors cursor-pointer"
                    onClick={() => toggleRow(row.id)}
                  >
                    <td className="p-2">
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3 text-binance-textSecondary" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-binance-textSecondary" />
                      )}
                    </td>
                    {columns.map((column) => (
                      <td 
                        key={column.key} 
                        className="p-2 text-xs text-binance-text"
                        style={{ width: column.width }}
                      >
                        {formatCellValue(column.key as keyof TradeHistory, row[column.key as keyof TradeHistory])}
                      </td>
                    ))}
                  </tr>
                  
                  {/* Expanded Row Details */}
                  {isExpanded && (
                    <tr className="bg-binance-bg border-b border-binance-border">
                      <td colSpan={columns.length + 1} className="p-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <h4 className="text-xs font-semibold text-binance-text mb-2">
                              Order Details
                            </h4>
                            <div className="space-y-1.5 text-xs">
                              <div className="flex justify-between">
                                <span className="text-binance-textSecondary">Order ID:</span>
                                <span className="font-mono text-binance-text">
                                  {row.details.orderId}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-binance-textSecondary">Exchange:</span>
                                <span className="font-semibold text-binance-text">
                                  {row.details.exchange}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-binance-textSecondary">Wallet:</span>
                                <span className="font-mono text-[10px] text-binance-text truncate max-w-xs">
                                  {row.details.wallet}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-xs font-semibold text-binance-text mb-2">
                              Transaction Hash
                            </h4>
                            <div className="space-y-1.5 text-xs">
                              <div className="bg-binance-card p-2 rounded border border-binance-border">
                                <span className="font-mono text-[10px] text-binance-textSecondary break-all">
                                  {row.details.txHash}
                                </span>
                              </div>
                              <div className="mt-1.5">
                                <span className="text-binance-textSecondary">Note:</span>
                                <p className="text-binance-text mt-0.5">
                                  {row.details.notes}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="mt-3 pt-3 border-t border-binance-border">
        <div className="flex items-center justify-between text-xs">
          <span className="text-binance-textSecondary">
            {data.length} trades
          </span>
          <div className="flex gap-4">
            <span className="text-binance-textSecondary">
              Total: 
              <span className="ml-2 font-mono font-semibold text-binance-text">
                ${data.reduce((sum, row) => sum + row.total, 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
            </span>
            <span className="text-binance-textSecondary">
              Fees: 
              <span className="ml-2 font-mono font-semibold text-binance-text">
                ${data.reduce((sum, row) => sum + row.fee, 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

