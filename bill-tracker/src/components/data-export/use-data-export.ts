"use client";

import { useState, useEffect, useCallback } from "react";
import { ArchiveStats, BackupStats, downloadBlob } from "./types";

interface UseDataExportOptions {
  companyCode: string;
  isOwner: boolean;
}

export type DownloadingDataType = "expenses" | "incomes" | "contacts" | null;

export function useDataExport({ companyCode, isOwner }: UseDataExportOptions) {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    currentDate.getMonth() + 1
  );
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [archiveStats, setArchiveStats] = useState<ArchiveStats | null>(null);
  const [backupStats, setBackupStats] = useState<BackupStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingBackupStats, setIsLoadingBackupStats] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);
  const [isDownloadingPEAK, setIsDownloadingPEAK] = useState(false);
  const [downloadingDataType, setDownloadingDataType] = useState<DownloadingDataType>(null);
  const [error, setError] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [peakError, setPeakError] = useState<string | null>(null);
  const [dataExportError, setDataExportError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [peakStats, setPeakStats] = useState<any | null>(null);
  const [isLoadingPeakStats, setIsLoadingPeakStats] = useState(false);

  const yearOptions = Array.from(
    { length: 3 },
    (_, i) => currentDate.getFullYear() - i
  );

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoadingStats(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/${companyCode}/archive?month=${selectedMonth}&year=${selectedYear}&preview=true`
        );
        if (!res.ok) {
          throw new Error("ไม่สามารถโหลดข้อมูลได้");
        }
        const response = await res.json();
        if (response.success && response.data) {
          setArchiveStats(response.data);
        } else {
          throw new Error(response.error || "ไม่สามารถโหลดข้อมูลได้");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
        setArchiveStats(null);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchStats();
  }, [companyCode, selectedMonth, selectedYear]);

  useEffect(() => {
    const fetchPeakStats = async () => {
      setIsLoadingPeakStats(true);
      setPeakError(null);
      try {
        const res = await fetch(
          `/api/${companyCode}/export-peak?month=${selectedMonth}&year=${selectedYear}&preview=true`
        );
        if (!res.ok) {
          throw new Error("ไม่สามารถโหลดข้อมูลได้");
        }
        const response = await res.json();
        if (response.success && response.data) {
          setPeakStats(response.data);
        } else {
          throw new Error(response.error || "ไม่สามารถโหลดข้อมูลได้");
        }
      } catch (err) {
        setPeakError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
        setPeakStats(null);
      } finally {
        setIsLoadingPeakStats(false);
      }
    };

    fetchPeakStats();
  }, [companyCode, selectedMonth, selectedYear]);

  useEffect(() => {
    if (!isOwner) return;

    const fetchBackupStats = async () => {
      setIsLoadingBackupStats(true);
      setBackupError(null);
      try {
        const res = await fetch(`/api/${companyCode}/backup`);
        if (!res.ok) {
          throw new Error("ไม่สามารถโหลดข้อมูลได้");
        }
        const response = await res.json();
        if (response.success && response.data) {
          setBackupStats(response.data);
        } else {
          throw new Error(response.error || "ไม่สามารถโหลดข้อมูลได้");
        }
      } catch (err) {
        setBackupError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
        setBackupStats(null);
      } finally {
        setIsLoadingBackupStats(false);
      }
    };

    fetchBackupStats();
  }, [companyCode, isOwner]);

  const handleDownloadArchive = async () => {
    setIsDownloading(true);
    setError(null);
    try {
      const res = await fetch(`/api/${companyCode}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: selectedMonth, year: selectedYear }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "ไม่สามารถสร้างไฟล์ได้");
      }

      const blob = await res.blob();
      const monthStr = String(selectedMonth).padStart(2, "0");
      downloadBlob(blob, `${companyCode}_${selectedYear}-${monthStr}.zip`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadBackup = async () => {
    setIsDownloadingBackup(true);
    setBackupError(null);
    try {
      const res = await fetch(`/api/${companyCode}/backup`, {
        method: "POST",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "ไม่สามารถสร้างไฟล์ได้");
      }

      const blob = await res.blob();
      const timestamp = new Date().toISOString().split("T")[0];
      downloadBlob(blob, `backup_${companyCode}_${timestamp}.json`);
    } catch (err) {
      setBackupError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsDownloadingBackup(false);
    }
  };

  const handleDownloadPEAK = async () => {
    setIsDownloadingPEAK(true);
    setPeakError(null);
    try {
      const res = await fetch(`/api/${companyCode}/export-peak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: selectedMonth, year: selectedYear }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "ไม่สามารถสร้างไฟล์ได้");
      }

      const blob = await res.blob();
      const monthStr = String(selectedMonth).padStart(2, "0");
      downloadBlob(
        blob,
        `PEAK_${companyCode}_${selectedYear}${monthStr}.xlsx`
      );
    } catch (err) {
      setPeakError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsDownloadingPEAK(false);
    }
  };

  const handleDownloadData = useCallback(async (type: "expenses" | "incomes" | "contacts") => {
    setDownloadingDataType(type);
    setDataExportError(null);
    try {
      const monthStr = String(selectedMonth).padStart(2, "0");
      let url: string;
      let filename: string;

      if (type === "contacts") {
        url = `/api/contacts/export?company=${companyCode}&format=peak`;
        filename = `Contacts_${companyCode}_${selectedYear}-${monthStr}.xlsx`;
      } else {
        url = `/api/reports/export?company=${companyCode}&type=${type}&month=${selectedMonth}&year=${selectedYear}`;
        const label = type === "expenses" ? "รายจ่าย" : "รายรับ";
        filename = `${label}_${companyCode}_${selectedYear}-${monthStr}.xlsx`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "ไม่สามารถสร้างไฟล์ได้");
      }

      const blob = await res.blob();
      downloadBlob(blob, filename);
    } catch (err) {
      setDataExportError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setDownloadingDataType(null);
    }
  }, [companyCode, selectedMonth, selectedYear]);

  const totalFiles = archiveStats
    ? archiveStats.totalExpenseFiles + archiveStats.totalIncomeFiles
    : 0;
  const totalRecords = archiveStats
    ? archiveStats.expenseCount + archiveStats.incomeCount
    : 0;

  return {
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
  };
}
