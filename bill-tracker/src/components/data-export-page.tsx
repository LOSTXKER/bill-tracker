"use client";

import { useDataExport } from "./data-export/use-data-export";
import { ArchiveExportCard } from "./data-export/ArchiveExportCard";
import { PeakExportCard } from "./data-export/PeakExportCard";
import { DataExportCard } from "./data-export/DataExportCard";
import { BackupCard } from "./data-export/BackupCard";
import { CloudStatusCard } from "./data-export/CloudStatusCard";
import { DataExportPageProps } from "./data-export/types";

export type { DataExportPageProps };

export function DataExportPage({
  companyName,
  companyCode,
  isOwner,
}: DataExportPageProps) {
  const {
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    yearOptions,

    archiveStats,
    isLoadingStats,
    error,
    isDownloading,
    handleDownloadArchive,
    totalFiles,
    totalRecords,

    peakStats,
    isLoadingPeakStats,
    peakError,
    isDownloadingPEAK,
    handleDownloadPEAK,

    backupStats,
    isLoadingBackupStats,
    backupError,
    isDownloadingBackup,
    handleDownloadBackup,
  } = useDataExport({ companyCode, isOwner });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ส่งออกข้อมูล</h1>
        <p className="text-muted-foreground mt-2">
          ส่งออกเอกสารและข้อมูลสำหรับ {companyName}
        </p>
      </div>

      <ArchiveExportCard
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        setSelectedMonth={setSelectedMonth}
        setSelectedYear={setSelectedYear}
        yearOptions={yearOptions}
        archiveStats={archiveStats}
        isLoadingStats={isLoadingStats}
        error={error}
        isDownloading={isDownloading}
        handleDownloadArchive={handleDownloadArchive}
        totalFiles={totalFiles}
        totalRecords={totalRecords}
      />

      <PeakExportCard
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        peakStats={peakStats}
        isLoadingPeakStats={isLoadingPeakStats}
        peakError={peakError}
        isDownloadingPEAK={isDownloadingPEAK}
        handleDownloadPEAK={handleDownloadPEAK}
      />

      <DataExportCard />

      {isOwner && (
        <BackupCard
          backupStats={backupStats}
          isLoadingBackupStats={isLoadingBackupStats}
          backupError={backupError}
          isDownloadingBackup={isDownloadingBackup}
          handleDownloadBackup={handleDownloadBackup}
        />
      )}

      <CloudStatusCard />
    </div>
  );
}
