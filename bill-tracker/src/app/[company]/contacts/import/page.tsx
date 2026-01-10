"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  FileSpreadsheet,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
} from "lucide-react";
import * as XLSX from "xlsx";

interface ContactsImportPageProps {
  params: Promise<{ company: string }>;
}

interface PreviewData {
  headers: string[];
  rows: any[];
  totalRows: number;
}

interface ImportResult {
  created: number;
  updated: number;
  errors: Array<{ row: number; error: string; data: any }>;
}

export default function ContactsImportPage({ params }: ContactsImportPageProps) {
  const { company: companyCode } = use(params);
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Check file type
    if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
      toast.error("กรุณาเลือกไฟล์ Excel (.xlsx, .xls)");
      return;
    }

    setFile(selectedFile);

    try {
      // Read and preview file
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (data.length === 0) {
        toast.error("ไฟล์ Excel ว่างเปล่า");
        setFile(null);
        return;
      }

      const headers = Object.keys(data[0] as object);
      setPreview({
        headers,
        rows: data.slice(0, 5), // Show first 5 rows
        totalRows: data.length,
      });

      toast.success(`โหลดไฟล์สำเร็จ: ${data.length} รายการ`);
    } catch (error) {
      toast.error("ไม่สามารถอ่านไฟล์ได้");
      setFile(null);
      setPreview(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const res = await fetch(`/api/contacts/import?company=${companyCode.toUpperCase()}`, {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await res.json();

      if (data.success) {
        setImportResult(data.data.results);
        toast.success(data.data.message);
      } else {
        throw new Error(data.error || "เกิดข้อผิดพลาด");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    // Create template data matching Peak export format
    const template = [
      {
        "รหัสผู้ติดต่อ": "C00001",
        "ประเภทผู้ติดต่อ": "ผู้จำหน่าย",
        "สัญชาติ": "ไทย",
        "เลขทะเบียนภาษี": "0123456789012",
        "สาขา": "00000",
        "บุคคล/นิติบุคคล": "นิติบุคคล",
        "ประเภทกิจการ": "บริษัทจำกัด",
        "คำนำหน้า": "บริษัท",
        "ชื่อ": "ร้านค้าตัวอย่าง จำกัด",
        "นามสกุล": "",
        "ผู้ติดต่อ": "คุณตัวอย่าง",
        "ที่อยู่": "123 ถนนตัวอย่าง",
        "แขวง/ตำบล": "แขวงตัวอย่าง",
        "เขต/อำเภอ": "เขตตัวอย่าง",
        "จังหวัด": "กรุงเทพฯ",
        "ประเทศ": "Thailand",
        "รหัสไปรษณีย์": "10100",
        "เบอร์โทร": "02-123-4567",
        "อีเมล": "example@email.com",
      },
      {
        "รหัสผู้ติดต่อ": "C00002",
        "ประเภทผู้ติดต่อ": "ลูกค้า",
        "สัญชาติ": "ไทย",
        "เลขทะเบียนภาษี": "1234567890123",
        "สาขา": "00000",
        "บุคคล/นิติบุคคล": "บุคคลธรรมดา",
        "ประเภทกิจการ": "",
        "คำนำหน้า": "คุณ",
        "ชื่อ": "สมชาย",
        "นามสกุล": "ใจดี",
        "ผู้ติดต่อ": "",
        "ที่อยู่": "456 ซอยตัวอย่าง",
        "แขวง/ตำบล": "บางนา",
        "เขต/อำเภอ": "บางนา",
        "จังหวัด": "กรุงเทพฯ",
        "ประเทศ": "Thailand",
        "รหัสไปรษณีย์": "10260",
        "เบอร์โทร": "081-234-5678",
        "อีเมล": "somchai@email.com",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ผู้ติดต่อ");
    XLSX.writeFile(wb, "Peak_Contacts_Template.xlsx");
    toast.success("ดาวน์โหลด Template สำเร็จ");
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/${companyCode}/contacts`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Import ผู้ติดต่อจาก Peak</h1>
          <p className="text-muted-foreground">
            นำเข้าข้อมูลผู้ติดต่อจากไฟล์ Excel ของ Peak
          </p>
        </div>
      </div>

      {/* Instructions */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>วิธีใช้:</strong>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>ดาวน์โหลด Template หรือ Export ข้อมูลจาก Peak</li>
            <li>อัปโหลดไฟล์ Excel (.xlsx, .xls)</li>
            <li>ตรวจสอบข้อมูล Preview และกด &quot;Import&quot;</li>
            <li>ระบบจะสร้างใหม่หรืออัปเดตข้อมูลตาม รหัสผู้ติดต่อ/เลขภาษี</li>
          </ol>
        </AlertDescription>
      </Alert>

      {/* Download Template */}
      <Card>
        <CardHeader>
          <CardTitle>Template</CardTitle>
          <CardDescription>
            ดาวน์โหลด Template สำหรับกรอกข้อมูลผู้ติดต่อ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            ดาวน์โหลด Template Excel
          </Button>
        </CardContent>
      </Card>

      {/* File Upload */}
      {!importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              อัปโหลดไฟล์
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button variant="outline" asChild>
                  <span>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    เลือกไฟล์ Excel
                  </span>
                </Button>
              </label>
              {file && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{file.name}</Badge>
                  <Badge>{preview?.totalRows} รายการ</Badge>
                </div>
              )}
            </div>

            {isImporting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>กำลังนำเข้าข้อมูล...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {preview && !importResult && (
        <Card>
          <CardHeader>
            <CardTitle>ตัวอย่างข้อมูล ({preview.totalRows} รายการ)</CardTitle>
            <CardDescription>
              แสดง 5 รายการแรก - ตรวจสอบความถูกต้องก่อน Import
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {preview.headers.map((header, i) => (
                      <TableHead key={i}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((row, i) => (
                    <TableRow key={i}>
                      {preview.headers.map((header, j) => (
                        <TableCell key={j} className="text-sm">
                          {row[header] || "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
              >
                ยกเลิก
              </Button>
              <Button onClick={handleImport} disabled={isImporting}>
                {isImporting ? "กำลัง Import..." : `Import ${preview.totalRows} รายการ`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Result */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              ผลการ Import
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {importResult.created}
                </div>
                <div className="text-sm text-muted-foreground">สร้างใหม่</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {importResult.updated}
                </div>
                <div className="text-sm text-muted-foreground">อัปเดต</div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-4 w-4" />
                  <span className="font-medium">
                    พบข้อผิดพลาด {importResult.errors.length} รายการ
                  </span>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {importResult.errors.map((err, i) => (
                    <Alert key={i} variant="destructive">
                      <AlertDescription>
                        <strong>แถว {err.row}:</strong> {err.error}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                  setImportResult(null);
                  setProgress(0);
                }}
              >
                Import อีกครั้ง
              </Button>
              <Button onClick={() => router.push(`/${companyCode}/contacts`)}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                ดูรายชื่อผู้ติดต่อ
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
