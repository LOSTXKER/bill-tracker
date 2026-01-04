"use client";

/**
 * Create Member Dialog Component
 * 
 * Dialog for creating new team members with password and custom permissions
 */

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { PermissionBuilder } from "./permission-builder";
import { UserPlus, Eye, EyeOff } from "lucide-react";

interface CreateMemberDialogProps {
    companyId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function CreateMemberDialog({
    companyId,
    open,
    onOpenChange,
    onSuccess,
}: CreateMemberDialogProps) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [isOwner, setIsOwner] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name) {
            toast.error("กรุณากรอกชื่อ");
            return;
        }

        if (!email) {
            toast.error("กรุณากรอกอีเมล");
            return;
        }

        if (!password) {
            toast.error("กรุณากรอกรหัสผ่าน");
            return;
        }

        if (password.length < 6) {
            toast.error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("รหัสผ่านไม่ตรงกัน");
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(`/api/companies/${companyId}/members`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    permissions,
                    isOwner,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to create member");
            }

            toast.success(`สร้างสมาชิก ${name} สำเร็จแล้ว`);
            onSuccess();

            // Reset form
            setName("");
            setEmail("");
            setPassword("");
            setConfirmPassword("");
            setPermissions([]);
            setIsOwner(false);
        } catch (error: any) {
            console.error("Error creating member:", error);
            toast.error(error.message || "ไม่สามารถสร้างสมาชิกได้");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto w-[95vw]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        สร้างสมาชิกใหม่
                    </DialogTitle>
                    <DialogDescription>
                        กรอกข้อมูลและกำหนดสิทธิ์สำหรับสมาชิกใหม่
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name Input */}
                    <div className="space-y-2">
                        <Label htmlFor="name">ชื่อ-นามสกุล</Label>
                        <Input
                            id="name"
                            type="text"
                            placeholder="ชื่อ-นามสกุล"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    {/* Email Input */}
                    <div className="space-y-2">
                        <Label htmlFor="email">อีเมล</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="example@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    {/* Password Input */}
                    <div className="space-y-2">
                        <Label htmlFor="password">รหัสผ่าน</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="อย่างน้อย 6 ตัวอักษร"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Confirm Password Input */}
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">ยืนยันรหัสผ่าน</Label>
                        <Input
                            id="confirmPassword"
                            type={showPassword ? "text" : "password"}
                            placeholder="ยืนยันรหัสผ่าน"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    {/* OWNER Checkbox */}
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="is-owner"
                            checked={isOwner}
                            onCheckedChange={(checked) => setIsOwner(checked as boolean)}
                        />
                        <div className="space-y-1">
                            <Label
                                htmlFor="is-owner"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                กำหนดเป็น OWNER
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                OWNER มีสิทธิ์ทั้งหมดและสามารถจัดการทีมได้
                            </p>
                        </div>
                    </div>

                    {/* Permission Builder (only if not owner) */}
                    {!isOwner && (
                        <div className="space-y-2">
                            <Label>กำหนดสิทธิ์</Label>
                            <PermissionBuilder
                                value={permissions}
                                onChange={setPermissions}
                            />
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            ยกเลิก
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "กำลังสร้าง..." : "สร้างสมาชิก"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
