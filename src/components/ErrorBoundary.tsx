/**
 * @file src/components/ErrorBoundary.tsx
 * @description React 全局错误边界组件，捕获未处理的渲染异常并提供友好恢复重载界面
 * @module 异常处理与容错模块
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen bg-[#18181B] text-[#F4F4F5] flex flex-col items-center justify-center p-8 select-none">
          <div className="max-w-md w-full bg-[#202127] border border-[#3F3F46] rounded-xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">界面组件渲染异常</h2>
              <p className="text-xs text-[#A1A1AA] mt-1.5 leading-relaxed">
                捕获到了非预期错误，系统已自动阻断并保护您的本地文档数据：
              </p>
              <div className="mt-3 p-2.5 rounded bg-[#18181B] border border-[#2E2E33] text-left text-xs font-mono text-rose-300 break-all max-h-32 overflow-y-auto">
                {this.state.error?.message || '未知错误'}
              </div>
            </div>
            <button
              onClick={this.handleReload}
              className="w-full py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-md"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>重新加载界面</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
