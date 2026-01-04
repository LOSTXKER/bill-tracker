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
    User,
    ExternalLink,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";
import { INCOME_STATUS_LABELS } from "@/lib/validations/income";
import { use } from "react";

interface IncomeDetailPageProps {
    params: Promise<{ company: string; id: string }>;
}

interface Income {
    id: string;
    contact: { id: string; name: string; taxId: string | null } | null;
    amount: number;
    vatRate: number;
    vatAmount: number | null;
    isWhtDeducted: boolean;
    whtRate: number | null;
    whtAmount: number | null;
    whtType: string | null;
    netReceived: number;
    source: string | null;
    invoiceNumber: string | null;
    referenceNo: string | null;
    paymentMethod: string;
    receiveDate: string;
    status: string;
    notes: string | null;
    customerSlipUrl: string | null;
    myBillCopyUrl: string | null;
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

export default function IncomeDetailPage({ params }: IncomeDetailPageProps) {
    const { company: companyCode, id } = use(params);
    const router = useRouter();
    const [income, setIncome] = useState<Income | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<Partial<Income>>({});

    useEffect(() => {
        fetchIncome();
    }, [id]);

    const fetchIncome = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/incomes/${id}`);
            if (!res.ok) {
                throw new Error("Failed to fetch income");
            }
            const result = await res.json();
            // Handle both old format (data.income) and new format (data.data.income)
            const income = result.data?.income || result.income;
            setIncome(income);
            setEditData(income);
        } catch (err) {
            setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!income) return;

        try {
            setSaving(true);
            const res = await fetch(`/api/incomes/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...editData,
                    vatAmount: editData.vatAmount,
                    whtAmount: editData.whtAmount,
                    netReceived: editData.netReceived,
                }),
            });

            if (!res.ok) {
                throw new Error("Failed to update income");
            }

            const result = await res.json();
            const updatedIncome = result.data?.income || result.income;
            setIncome(updatedIncome);
            setEditData(updatedIncome);
            setIsEditing(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
        } finally {
            setSaving(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!income) return;

        try {
            setSaving(true);
            const res = await fetch(`/api/incomes/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...income,
                    status: newStatus,
                    vatAmount: income.vatAmount,
                    whtAmount: income.whtAmount,
                    netReceived: income.netReceived,
                }),
            });

            if (!res.ok) {
                throw new Error("Failed to update status");
            }

            const result = await res.json();
            const updatedIncome = result.data?.income || result.income;
            setIncome(updatedIncome);
            setEditData(updatedIncome);
        } catch (err) {
            setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
        } finally {
            setSaving(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusInfo = INCOME_STATUS_LABELS[status] || {
            label: status,
            color: "gray",
        };
    const colorMap: Record<string, string> = {
      gray: "bg-muted text-muted-foreground border-border",
      orange:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
      red: "bg-destructive/10 text-destructive border-destructive/20",
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

    if (error || !income) {
        return (
            <div className="space-y-4">
                <Link href={`/${companyCode}/incomes`}>
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
                    <Link href={`/${companyCode}/incomes`}>
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-xl font-semibold text-foreground">
                            {income.contact?.name || income.source || "รายรับ"}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {income.source || "ไม่มีรายละเอียด"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {getStatusBadge(income.status)}
                    {isEditing ? (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setIsEditing(false);
                                    setEditData(income);
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
                                        {formatCurrency(Number(income.amount))}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-xs">VAT</Label>
                                    <p className="text-foreground">
                                        {income.vatRate}%
                                        {income.vatAmount &&
                                            ` (${formatCurrency(Number(income.vatAmount))})`}
                                    </p>
                                </div>
                                {income.isWhtDeducted && (
                                    <>
                                        <div>
                                            <Label className="text-muted-foreground text-xs">
                                                ถูกหัก ณ ที่จ่าย
                                            </Label>
                                            <p className="text-foreground">
                                                {income.whtRate}%
                                                {income.whtAmount &&
                                                    ` (${formatCurrency(Number(income.whtAmount))})`}
                                            </p>
                                        </div>
                                        <div>
                                            <Label className="text-muted-foreground text-xs">
                                                ประเภท WHT
                                            </Label>
                                            <p className="text-foreground">{income.whtType || "-"}</p>
                                        </div>
                                    </>
                                )}
                                <div className="sm:col-span-2">
                                    <Label className="text-muted-foreground text-xs">
                                        ยอดรับจริง
                                    </Label>
                                    <p className="text-2xl font-bold text-primary">
                                        {formatCurrency(Number(income.netReceived))}
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
                                    <Label className="text-muted-foreground text-xs">แหล่งที่มา</Label>
                                    {isEditing ? (
                                        <Input
                                            value={editData.source || ""}
                                            onChange={(e) =>
                                                setEditData({ ...editData, source: e.target.value })
                                            }
                                        />
                                    ) : (
                                        <p className="text-foreground">{income.source || "-"}</p>
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
                                        <p className="text-foreground">{income.invoiceNumber || "-"}</p>
                                    )}
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-xs">
                                        วิธีการชำระเงิน
                                    </Label>
                                    <p className="text-foreground">
                                        {PAYMENT_METHOD_LABELS[income.paymentMethod] ||
                                            income.paymentMethod}
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
                                        <p className="text-foreground">{income.referenceNo || "-"}</p>
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
                            <div>
                                <Label className="text-muted-foreground text-xs">
                                    วันที่รับเงิน
                                </Label>
                                <p className="text-foreground">
                                    {new Date(income.receiveDate).toLocaleDateString("th-TH", {
                                        day: "numeric",
                                        month: "long",
                                        year: "numeric",
                                    })}
                                </p>
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
                                    {income.notes || "ไม่มีหมายเหตุ"}
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
                            {Object.entries(INCOME_STATUS_LABELS).map(([key, { label }]) => (
                                <Button
                                    key={key}
                                    variant={income.status === key ? "default" : "outline"}
                                    size="sm"
                                    className="w-full justify-start"
                                    onClick={() => handleStatusChange(key)}
                                    disabled={saving || income.status === key}
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
                                label="สลิปลูกค้า"
                                url={income.customerSlipUrl}
                                placeholder="ยังไม่ได้อัพโหลด"
                            />
                            <EvidenceItem
                                label="สำเนาบิลขาย"
                                url={income.myBillCopyUrl}
                                placeholder="ยังไม่ได้อัพโหลด"
                            />
                            {income.isWhtDeducted && (
                                <EvidenceItem
                                    label="ใบ 50 ทวิ (จากลูกค้า)"
                                    url={income.whtCertUrl}
                                    placeholder="ยังไม่ได้อัพโหลด"
                                />
                            )}
                        </CardContent>
                    </Card>

                    {/* Contact Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <User className="h-4 w-4" />
                                ผู้ติดต่อ
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="font-medium text-foreground">
                                {income.contact?.name || "ไม่ระบุ"}
                            </p>
                            {income.contact?.taxId && (
                                <p className="text-sm text-muted-foreground mt-1">
                                    เลขผู้เสียภาษี: {income.contact.taxId}
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
                                <span className="text-foreground">{income.creator?.name || "-"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">สร้างเมื่อ</span>
                                <span className="text-foreground">
                                    {new Date(income.createdAt).toLocaleDateString("th-TH")}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">แก้ไขล่าสุด</span>
                                <span className="text-foreground">
                                    {new Date(income.updatedAt).toLocaleDateString("th-TH")}
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
                <Link href={`/${companyCode}/incomes`}>
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
