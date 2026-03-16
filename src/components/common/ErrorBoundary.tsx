import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * React Error Boundary 元件
 * 捕獲子元件渲染錯誤，防止整個應用崩潰
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // 更新 state 使下一次渲染顯示 fallback UI
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 記錄錯誤到 console，未來可擴展到錯誤追蹤服務（Sentry 等）
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    this.props.onReset?.();
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      // 自定義 fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-lg shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-xl">發生意外錯誤</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-center">
                很抱歉，應用程式發生錯誤。請嘗試重新整理頁面，或返回首頁。
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="space-y-2">
                  <div className="rounded-md bg-destructive/10 p-3 overflow-auto">
                    <p className="text-sm font-mono text-destructive">
                      {this.state.error.name}: {this.state.error.message}
                    </p>
                  </div>
                  {this.state.errorInfo && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        查看堆疊追蹤
                      </summary>
                      <pre className="mt-2 p-2 rounded bg-muted overflow-auto max-h-48">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2 justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={this.handleReset}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  重試
                </Button>
                <Button
                  variant="outline"
                  onClick={this.handleReload}
                  className="flex items-center gap-2"
                >
                  重新整理
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  返回首頁
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 區域性 Error Boundary
 * 用於包裝特定區塊，錯誤時只影響該區塊而非整頁
 */
export function SectionErrorBoundary({ 
  children, 
  sectionName = '此區塊',
  onReset 
}: { 
  children: ReactNode; 
  sectionName?: string;
  onReset?: () => void;
}) {
  return (
    <ErrorBoundary
      fallback={
        <Card className="m-4">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-base">{sectionName}載入失敗</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              此區塊發生錯誤，其他功能仍可正常使用。
            </p>
            <Button variant="outline" size="sm" onClick={onReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              重試
            </Button>
          </CardContent>
        </Card>
      }
      onReset={onReset}
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
