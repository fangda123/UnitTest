import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Error Boundary Component
 * จัดการ error ที่เกิดขึ้นใน component tree
 * แสดง fallback UI แทนที่จะให้ทั้งแอพ crash
 */

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // อัพเดท state เพื่อแสดง fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error ไปยัง error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // แสดง fallback UI ที่กำหนดเอง หรือใช้ default
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-dark-900 flex items-center justify-center p-6">
          <div className="bg-dark-800 rounded-lg p-8 max-w-md w-full border border-danger/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-danger/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-danger" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-100">
                  เกิดข้อผิดพลาด
                </h2>
                <p className="text-sm text-gray-400">Something went wrong</p>
              </div>
            </div>

            <div className="bg-dark-900/50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-300 font-mono">
                {this.state.error?.message || 'Unknown error'}
              </p>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              รีโหลดหน้าเว็บ
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

