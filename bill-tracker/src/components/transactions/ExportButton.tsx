"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { exportToCSV, exportToExcel } from "@/lib/utils/export";

interface ExportButtonProps {
  data: any[];
  filename: string;
  type: "expense" | "income";
  disabled?: boolean;
}

export function ExportButton({ data, filename, type, disabled = false }: ExportButtonProps) {
  const handleExportCSV = () => {
    exportToCSV(data, filename, type);
  };

  const handleExportExcel = () => {
    exportToExcel(data, filename, type);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || data.length === 0}>
          <FileDown className="mr-2 h-4 w-4" />
          ส่งออก
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCSV}>
          <FileText className="mr-2 h-4 w-4" />
          ส่งออกเป็น CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          ส่งออกเป็น Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
