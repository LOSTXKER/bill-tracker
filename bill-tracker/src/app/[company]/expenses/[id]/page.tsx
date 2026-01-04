"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ArrowLeft,
    Edit,
    Save,
    X,
    Receipt,
    FileText,
    CreditCard,
    Calendar,
    Building2,
    Upload,
    ExternalLink,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";
import {
    EXPENSE_CATEGORY_LABELS,
    EXPENSE_STATUS_LABELS,
} from "@/lib/validations/expense";
import { use } from "react";

interface ExpenseDetailPageProps {
    params: Promise<{ company: string; id: string }>;
}

interface Expense {
    id: string;
    contact: { id: string; name: string; taxId: string | null } | null;
    amount: number;
    vatRate: number;
    vatAmount: number | null;
    isWht: boolean;
    whtRate: number | null;
    whtAmount: number | null;
    whtType: string | null;
    netPaid: number;
    description: string | null;
    category: string | null;
    invoiceNumber: string | null;
    referenceNo: string | null;
    paymentMethod: string;
    billDate: string;
    dueDate: string | null;
    status: string;
    notes: string | null;
    slipUrl: string | null;
    taxInvoiceUrl: string | null;
    whtCertUrl: string | null;
    company: { code: string; name: string };
    creator?: { name: string; email: string } | null;
    createdAt: string;
    updatedAt: string;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
    CASH: "เงินสด",
    BANK_TRANSFER: "โอนเงิน",
    CREDIT_CARD: "บัตรเครดิต",
    PROMPTPAY: "พร้อมเพย์",
    CHEQUE: "เช็ค",
};

export default function ExpenseDetailPage({ params }: ExpenseDetailPageProps) {
    const { company: companyCode, id } = use(params);
    const router = useRouter();
    const [expense, setExpense] = useState<Expense | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<Partial<Expense>>({});

    useEffect(() => {
        fetchExpense();
    }, [id]);

    const fetchExpense = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/expenses/${id}`);
            if (!res.ok) {
                throw new Error("Failed to fetch expense");
            }
            const result = await res.json();
            // Handle both old format (data.expense) and new format (data.data.expense)
            const expense = result.data?.expense || result.expense;
            setExpense(expense);
            setEditData(expense);
        } catch (err) {
            setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!expense) return;

        try {
            setSaving(true);
            const res = await fetch(`/api/expenses/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...editData,
                    vatAmount: editData.vatAmount,
                    whtAmount: editData.whtAmount,
                    netPaid: editData.netPaid,
                }),
            });

            if (!res.ok) {
                throw new Error("Failed to update expense");
            }

            const result = await res.json();
            const updatedExpense = result.data?.expense || result.expense;
            setExpense(updatedExpense);
            setEditData(updatedExpense);
            setIsEditing(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
        } finally {
            setSaving(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!expense) return;

        try {
            setSaving(true);
            const res = await fetch(`/api/expenses/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...expense,
                    status: newStatus,
                    vatAmount: expense.vatAmount,
                    whtAmount: expense.whtAmount,
                    netPaid: expense.netPaid,
                }),
            });

            if (!res.ok) {
                throw new Error("Failed to update status");
            }

            const result = await res.json();
            const updatedExpense = result.data?.expense || result.expense;
            setExpense(updatedExpense);
            setEditData(updatedExpense);
        } catch (err) {
            setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
        } finally {
            setSaving(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusInfo = EXPENSE_STATUS_LABELS[status] || {
            label: status,
            color: "gray",
        };
        const colorMap: Record<string, string> = {
            orange:
                "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
            red: "bg-destructive/10 text-destructive border-destructive/20",
            yellow:
                "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
            green: "bg-primary/10 text-primary border-primary/20",
        };
        return (
            <Badge variant="outline" className={colorMap[statusInfo.color] || ""}>
                {statusInfo.label}
            </Badge>
        );
    };

    if (loading) {
        return <LoadingSkeleton companyCode={companyCode} />;
    }

    if (error || !expense) {
        return (
            <div className="space-y-4">
                <Link href={`/${companyCode}/expenses`}>
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        กลับ
                    </Button>
                </Link>
                <div className="text-center py-12">
                    <p className="text-destructive">{error || "ไม่พบรายการ"}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <Link href={`/${companyCode}/expenses`}>
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-xl font-semibold text-foreground">
                            {expense.contact?.name || expense.description || "รายจ่าย"}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {expense.description || "ไม่มีรายละเอียด"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {getStatusBadge(expense.status)}
                    {isEditing ? (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setIsEditing(false);
                                    setEditData(expense);
                                }}
                                disabled={saving}
                            >
                                <X className="mr-2 h-4 w-4" />
                                ยกเลิก
                            </Button>
                            <Button size="sm" onClick={handleSave} disabled={saving}>
                                <Save className="mr-2 h-4 w-4" />
                                {saving ? "กำลังบันทึก..." : "บันทึก"}
                            </Button>
                        </>
                    ) : (
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                            <Edit className="mr-2 h-4 w-4" />
                            แก้ไข
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Financial Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                ข้อมูลการเงิน
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label className="text-muted-foreground text-xs">
                                        ยอดเงิน (ก่อน VAT)
                                    </Label>
                                    <p className="text-lg font-semibold text-foreground">
                                        {formatCurrency(Number(expense.amount))}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-xs">VAT</Label>
                                    <p className="text-foreground">
                                        {expense.vatRate}%
                                        {expense.vatAmount &&
                                            ` (${formatCurrency(Number(expense.vatAmount))})`}
                                    </p>
                                </div>
                                {expense.isWht && (
                                    <>
                                        <div>
                                            <Label className="text-muted-foreground text-xs">
                                                หัก ณ ที่จ่าย
                                            </Label>
                                            <p className="text-foreground">
                                                {expense.whtRate}%
                                                {expense.whtAmount &&
                                                    ` (${formatCurrency(Number(expense.whtAmount))})`}
                                            </p>
                                        </div>
                                        <div>
                                            <Label className="text-muted-foreground text-xs">
                                                ประเภท WHT
                                            </Label>
                                            <p className="text-foreground">{expense.whtType || "-"}</p>
                                        </div>
                                    </>
                                )}
                                <div className="sm:col-span-2">
                                    <Label className="text-muted-foreground text-xs">
                                        ยอดจ่ายจริง
                                    </Label>
                                    <p className="text-2xl font-bold text-destructive">
                                        {formatCurrency(Number(expense.netPaid))}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Document Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                ข้อมูลเอกสาร
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label className="text-muted-foreground text-xs">หมวดหมู่</Label>
                                    {isEditing ? (
                                        <Select
                                            value={editData.category || ""}
                                            onValueChange={(v) =>
                                                setEditData({ ...editData, category: v })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="เลือกหมวดหมู่" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(EXPENSE_CATEGORY_LABELS).map(
                                                    ([key, label]) => (
                                                        <SelectItem key={key} value={key}>
                                                            {label}
                                                        </SelectItem>
                                                    )
                                                )}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <p className="text-foreground">
                                            {expense.category
                                                ? EXPENSE_CATEGORY_LABELS[expense.category] ||
                                                expense.category
                                                : "-"}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-xs">
                                        เลขที่ใบกำกับภาษี
                                    </Label>
                                    {isEditing ? (
                                        <Input
                                            value={editData.invoiceNumber || ""}
                                            onChange={(e) =>
                                                setEditData({ ...editData, invoiceNumber: e.target.value })
                                            }
                                        />
                                    ) : (
                                        <p className="text-foreground">{expense.invoiceNumber || "-"}</p>
                                    )}
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-xs">
                                        วิธีการชำระเงิน
                                    </Label>
                                    <p className="text-foreground">
                                        {PAYMENT_METHOD_LABELS[expense.paymentMethod] ||
                                            expense.paymentMethod}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-xs">เลขอ้างอิง</Label>
                                    {isEditing ? (
                                        <Input
                                            value={editData.referenceNo || ""}
                                            onChange={(e) =>
                                                setEditData({ ...editData, referenceNo: e.target.value })
                                            }
                                        />
                                    ) : (
                                        <p className="text-foreground">{expense.referenceNo || "-"}</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Dates */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                วันที่
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label className="text-muted-foreground text-xs">
                                        วันที่จ่ายเงิน
                                    </Label>
                                    <p className="text-foreground">
                                        {new Date(expense.billDate).toLocaleDateString("th-TH", {
                                            day: "numeric",
                                            month: "long",
                                            year: "numeric",
                                        })}
                                    </p>
                                </div>
                                {expense.dueDate && (
                                    <div>
                                        <Label className="text-muted-foreground text-xs">
                                            วันครบกำหนด
                                        </Label>
                                        <p className="text-foreground">
                                            {new Date(expense.dueDate).toLocaleDateString("th-TH", {
                                                day: "numeric",
                                                month: "long",
                                                year: "numeric",
                                            })}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notes */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">หมายเหตุ</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isEditing ? (
                                <Textarea
                                    value={editData.notes || ""}
                                    onChange={(e) =>
                                        setEditData({ ...editData, notes: e.target.value })
                                    }
                                    placeholder="เพิ่มหมายเหตุ..."
                                    rows={3}
                                />
                            ) : (
                                <p className="text-foreground whitespace-pre-wrap">
                                    {expense.notes || "ไม่มีหมายเหตุ"}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Status Actions */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">เปลี่ยนสถานะ</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {Object.entries(EXPENSE_STATUS_LABELS).map(([key, { label }]) => (
                                <Button
                                    key={key}
                                    variant={expense.status === key ? "default" : "outline"}
                                    size="sm"
                                    className="w-full justify-start"
                                    onClick={() => handleStatusChange(key)}
                                    disabled={saving || expense.status === key}
                                >
                                    {label}
                                </Button>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Evidence Files */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Receipt className="h-4 w-4" />
                                หลักฐาน
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <EvidenceItem
                                label="สลิปโอนเงิน"
                                url={expense.slipUrl}
                                placeholder="ยังไม่ได้อัพโหลด"
                            />
                            <EvidenceItem
                                label="ใบกำกับภาษี"
                                url={expense.taxInvoiceUrl}
                                placeholder="ยังไม่ได้อัพโหลด"
                            />
                            {expense.isWht && (
                                <EvidenceItem
                                    label="ใบ 50 ทวิ"
                                    url={expense.whtCertUrl}
                                    placeholder="ยังไม่ได้อัพโหลด"
                                />
                            )}
                        </CardContent>
                    </Card>

                    {/* Contact Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                ผู้ติดต่อ
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="font-medium text-foreground">
                                {expense.contact?.name || "ไม่ระบุ"}
                            </p>
                            {expense.contact?.taxId && (
                                <p className="text-sm text-muted-foreground mt-1">
                                    เลขผู้เสียภาษี: {expense.contact.taxId}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Meta Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">ข้อมูลระบบ</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">สร้างโดย</span>
                                <span className="text-foreground">{expense.creator?.name || "-"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">สร้างเมื่อ</span>
                                <span className="text-foreground">
                                    {new Date(expense.createdAt).toLocaleDateString("th-TH")}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">แก้ไขล่าสุด</span>
                                <span className="text-foreground">
                                    {new Date(expense.updatedAt).toLocaleDateString("th-TH")}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function EvidenceItem({
    label,
    url,
    placeholder,
}: {
    label: string;
    url: string | null;
    placeholder: string;
}) {
    return (
        <div>
            <Label className="text-muted-foreground text-xs">{label}</Label>
            {url ? (
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline mt-1"
                >
                    <ExternalLink className="h-3 w-3" />
                    ดูหลักฐาน
                </a>
            ) : (
                <p className="text-sm text-muted-foreground mt-1">{placeholder}</p>
            )}
        </div>
    );
}

function LoadingSkeleton({ companyCode }: { companyCode: string }) {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href={`/${companyCode}/expenses`}>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32 mt-1" />
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    {[1, 2, 3].map((i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-5 w-32" />
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {[1, 2, 3, 4].map((j) => (
                                        <div key={j}>
                                            <Skeleton className="h-3 w-20 mb-2" />
                                            <Skeleton className="h-5 w-32" />
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <div className="space-y-6">
                    {[1, 2, 3].map((i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-5 w-24" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-20 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
