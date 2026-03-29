import { FeatureErrorBoundary } from "@/components/shared/FeatureErrorBoundary";

export default function ReconcileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FeatureErrorBoundary feature="การกระทบยอด">
      {children}
    </FeatureErrorBoundary>
  );
}
