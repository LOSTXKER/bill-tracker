"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateCompanyDialogProps {
  children: React.ReactNode;
}

export function CreateCompanyDialog({ children }: CreateCompanyDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [formData, setFormData] = React.useState({
    name: "",
    code: "",
    taxId: "",
    address: "",
    phone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาด");
      }

      // Success! Redirect to the new company dashboard
      setOpen(false);
      router.push(`/${data.company.code.toLowerCase()}/dashboard`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "code" ? value.toUpperCase() : value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-emerald-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              สร้างบริษัทใหม่
            </DialogTitle>
            <DialogDescription>
              กรอกข้อมูลบริษัทของคุณ คุณจะเป็นเจ้าของบริษัทนี้โดยอัตโนมัติ
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">
                ชื่อบริษัท <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="เช่น บริษัท ABC จำกัด"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">
                รหัสบริษัท <span className="text-red-500">*</span>
              </Label>
              <Input
                id="code"
                name="code"
                placeholder="เช่น MYCOMPANY (2-10 ตัวอักษร)"
                value={formData.code}
                onChange={handleChange}
                maxLength={10}
                pattern="[A-Za-z0-9]{2,10}"
                required
              />
              <p className="text-xs text-slate-500">
                รหัสจะใช้ใน URL เช่น /mycompany/dashboard
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxId">เลขประจำตัวผู้เสียภาษี</Label>
              <Input
                id="taxId"
                name="taxId"
                placeholder="เช่น 1234567890123"
                value={formData.taxId}
                onChange={handleChange}
                maxLength={13}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">โทรศัพท์</Label>
              <Input
                id="phone"
                name="phone"
                placeholder="เช่น 02-123-4567"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">ที่อยู่</Label>
              <Input
                id="address"
                name="address"
                placeholder="ที่อยู่บริษัท"
                value={formData.address}
                onChange={handleChange}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.name || !formData.code}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  กำลังสร้าง...
                </>
              ) : (
                "สร้างบริษัท"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
