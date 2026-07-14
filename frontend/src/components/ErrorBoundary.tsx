import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="p-6 m-4 bg-red-50 border border-red-200 rounded-lg text-red-900 max-w-4xl mx-auto overflow-auto">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <h2 className="text-lg font-bold text-red-700">UI Component Crashed!</h2>
          </div>
          <p className="font-semibold mb-2">Error Message:</p>
          <pre className="bg-red-100 p-3 rounded text-sm mb-4 whitespace-pre-wrap">
            {this.state.error?.toString()}
          </pre>
          
          <p className="font-semibold mb-2">Component Stack Trace:</p>
          <pre className="bg-red-100 p-3 rounded text-xs overflow-auto max-h-[400px] whitespace-pre-wrap">
            {this.state.errorInfo?.componentStack}
          </pre>
          
          <button 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
