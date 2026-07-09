import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in React render cycle:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mb-4 animate-bounce">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl mb-2">
            Something went wrong
          </h2>
          <p className="text-muted-foreground max-w-md mb-6 text-sm">
            An unexpected error occurred in the user interface. Please try reloading the page.
          </p>
          {this.state.error && (
            <pre className="p-4 bg-muted text-muted-foreground rounded text-left overflow-auto max-w-lg max-h-40 text-xs mb-6 font-mono border border-border">
              {this.state.error.toString()}
            </pre>
          )}
          <Button onClick={this.handleReload} className="w-full max-w-xs shadow-md">
            Reload Application
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
