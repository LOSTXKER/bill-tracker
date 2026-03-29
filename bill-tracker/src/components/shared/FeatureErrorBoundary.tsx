"use client";
import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
  feature?: string;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class FeatureErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const feature = this.props.feature ?? "unknown";
    console.error(`[FeatureErrorBoundary:${feature}]`, error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    const { feature } = this.props;
    const label = feature ? `"${feature}"` : "นี้";

    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 px-4">
        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-7 w-7 text-destructive" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="font-semibold text-foreground">
            เกิดข้อผิดพลาดในส่วน {label}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {this.state.error?.message ||
              "เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองโหลดหน้าใหม่"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          โหลดหน้าใหม่
        </Button>
      </div>
    );
  }
}
