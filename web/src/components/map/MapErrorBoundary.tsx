import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { MapFallback } from "./MapFallback";

interface Props {
  children: ReactNode;
  onRetry: () => void;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class MapErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    errorMessage: "",
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage:
        error.message || "Đã xảy ra lỗi không xác định trong quá trình render bản đồ.",
    };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("MapErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: "" });
    this.props.onRetry();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <MapFallback error={this.state.errorMessage} onRetry={this.handleRetry} />
      );
    }

    return this.props.children;
  }
}
export default MapErrorBoundary;
