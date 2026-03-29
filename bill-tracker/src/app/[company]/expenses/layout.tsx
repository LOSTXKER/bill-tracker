import { FeatureErrorBoundary } from "@/components/shared/FeatureErrorBoundary";

export default function ExpensesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FeatureErrorBoundary feature="รายจ่าย">{children}</FeatureErrorBoundary>
  );
}
