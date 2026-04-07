"use client";

import { useDataExport } from "./data-export/use-data-export";
import { ArchiveExportCard } from "./data-export/ArchiveExportCard";
import { PeakExportCard } from "./data-export/PeakExportCard";
import { DataExportCard } from "./data-export/DataExportCard";
import { BackupCard } from "./data-export/BackupCard";
import { DataExportPageProps, THAI_MONTHS } from "./data-export/types";
import { PageHeader } from "./shared/PageHeader";
import { Download, Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

    downloadingDataType,
    dataExportError,
    handleDownloadData,
  } = useDataExport({ companyCode, isOwner });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Download}
        title="ส่งออกข้อมูล"
        description={`ส่งออกเอกสารและข้อมูลสำหรับ ${companyName}`}
      />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          ช่วงเวลา
        </div>
        <Select
          value={String(selectedMonth)}
          onValueChange={(v) => setSelectedMonth(parseInt(v))}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="เลือกเดือน" />
          </SelectTrigger>
          <SelectContent>
            {THAI_MONTHS.map((month, idx) => (
              <SelectItem key={idx + 1} value={String(idx + 1)}>
                {month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(selectedYear)}
          onValueChange={(v) => setSelectedYear(parseInt(v))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="เลือกปี" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year} (พ.ศ. {year + 543})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ArchiveExportCard
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        archiveStats={archiveStats}
        isLoadingStats={isLoadingStats}
        error={error}
        isDownloading={isDownloading}
        handleDownloadArchive={handleDownloadArchive}
        totalFiles={totalFiles}
        totalRecords={totalRecords}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <PeakExportCard
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          peakStats={peakStats}
          isLoadingPeakStats={isLoadingPeakStats}
          peakError={peakError}
          isDownloadingPEAK={isDownloadingPEAK}
          handleDownloadPEAK={handleDownloadPEAK}
        />

        <DataExportCard
          companyCode={companyCode}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          downloadingDataType={downloadingDataType}
          dataExportError={dataExportError}
          handleDownloadData={handleDownloadData}
        />
      </div>

      {isOwner && (
        <BackupCard
          backupStats={backupStats}
          isLoadingBackupStats={isLoadingBackupStats}
          backupError={backupError}
          isDownloadingBackup={isDownloadingBackup}
          handleDownloadBackup={handleDownloadBackup}
        />
      )}
    </div>
  );
}
