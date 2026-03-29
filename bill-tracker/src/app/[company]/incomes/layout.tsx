import { FeatureErrorBoundary } from "@/components/shared/FeatureErrorBoundary";

export default function IncomesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FeatureErrorBoundary feature="รายรับ">{children}</FeatureErrorBoundary>
  );
}
