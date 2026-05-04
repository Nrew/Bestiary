import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getLogger } from "@/lib/logger";

const log = getLogger("ErrorBoundary");

interface Props {
  children: ReactNode;
  level?: "app" | "component";
}

interface State {
  hasError: boolean;
  error?: Error;
}

/** Catches render errors in descendants, logs them, and shows a fallback UI. */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    log.error(
      "ErrorBoundary caught an error:",
      error,
      errorInfo.componentStack
    );
  }

  // window.location.reload() is the right recovery for a desktop app crash;
  // simply unmounting the error boundary can leave backend state inconsistent.
  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { level = "component" } = this.props;

      if (level === "component") {
        return (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This component failed to render.
              </AlertDescription>
            </Alert>
          </div>
        );
      }

      return (
        <div className="flex h-screen w-full items-center justify-center bg-background p-8">
          <Card className="w-full max-w-lg text-center">
            <CardHeader>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="mt-4">Application Error</CardTitle>
              <CardDescription>
                A critical error occurred and the application cannot continue.
                Please save any external work and reload.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={this.handleReload}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload Application
              </Button>
              {this.state.error && (
                <details className="mt-4 rounded-md bg-muted p-2 text-left text-xs">
                  <summary className="cursor-pointer font-medium">
                    Error Details
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap font-mono text-muted-foreground">
                    {this.state.error.stack || this.state.error.message}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
