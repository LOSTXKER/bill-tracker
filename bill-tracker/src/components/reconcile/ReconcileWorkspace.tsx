"use client";

import { ImportPanel } from "./ImportPanel";
import { ReconcileTable } from "./ReconcileTable";
import { ReconcileToolbar } from "./ReconcileToolbar";
import { ReconcileSummaryBar } from "./ReconcileSummaryBar";
import { useReconcileSession } from "./useReconcileSession";
import type { ReconcileWorkspaceProps } from "./reconcile-types";
export type { SiblingCompany } from "./reconcile-types";

export function ReconcileWorkspace(props: ReconcileWorkspaceProps) {
  const {
    companyCode,
    year,
    month,
    type,
    siblingCompanies,
    selectedCompanyCodes,
    savedSession,
  } = props;

  const session = useReconcileSession(props);

  const {
    router,
    pairs,
    systemItems,
    accountingItems,
    showImport,
    setShowImport,
    selectedSystemId,
    selectedAccountingIndex,
    monthRange,
    setMonthRange,
    spilloverInfo,
    hasAccountingData,
    hasSiblings,
    handleImport,
    handleConfirmAI,
    handleRejectAI,
    handleManualLink,
    handleUnlink,
    handleSpilloverInfo,
    setSelectedSystemId,
    setSelectedAccountingIndex,
  } = session;

  return (
    <div className="space-y-3">
      <ReconcileToolbar
        session={session}
        companyCode={companyCode}
        year={year}
        month={month}
        type={type}
        savedSession={savedSession}
        siblingCompanies={siblingCompanies}
        selectedCompanyCodes={selectedCompanyCodes}
        router={router}
      />

      <ReconcileSummaryBar
        pairs={pairs}
        systemItems={systemItems}
        accountingItems={accountingItems}
        spilloverInfo={spilloverInfo}
        monthRange={monthRange}
        onMonthRangeChange={setMonthRange}
      />

      <ReconcileTable
        pairs={pairs}
        systemItems={systemItems}
        onConfirmAI={handleConfirmAI}
        onRejectAI={handleRejectAI}
        onManualLink={handleManualLink}
        onUnlink={handleUnlink}
        selectedSystemId={selectedSystemId}
        selectedAccountingIndex={selectedAccountingIndex}
        onSelectSystem={setSelectedSystemId}
        onSelectAccounting={setSelectedAccountingIndex}
        month={month}
        year={year}
        type={type}
        onShowImport={() => setShowImport(true)}
        hasAccountingData={hasAccountingData}
        showCompanyBadge={hasSiblings}
        companyCode={companyCode}
        monthRange={monthRange}
        onMonthRangeChange={setMonthRange}
        onSpilloverInfo={handleSpilloverInfo}
      />

      <ImportPanel
        open={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImport}
        companyCode={companyCode}
        month={month}
        year={year}
        type={type === "PP36" ? "expense" : type.toLowerCase() as "expense" | "income"}
      />
    </div>
  );
}
