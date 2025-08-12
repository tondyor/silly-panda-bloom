import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // Здесь можно будет добавить отправку логов в систему мониторинга
  }

  private handleRetry = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 text-red-900 p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Что-то пошло не так.</h1>
            <p className="mb-4">В приложении произошла критическая ошибка.</p>
            {this.state.error && (
              <details className="mb-4 bg-red-100 p-2 rounded text-left text-xs">
                <summary>Технические детали</summary>
                <pre className="mt-2 whitespace-pre-wrap break-all">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <Button onClick={this.handleRetry} variant="destructive">
              Перезагрузить приложение
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;