import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportBoundaryError } from "@/lib/monitoring";

type Props = {
  children: ReactNode;
  label: string;
};

type State = {
  error: Error | null;
};

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    reportBoundaryError(error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <h2 className="text-xl font-bold tracking-tight">
            Something went wrong on {this.props.label}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{this.state.error.message}</p>
          <button
            type="button"
            className="mt-4 text-sm font-medium text-primary underline-offset-4 hover:underline"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
