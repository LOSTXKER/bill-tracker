'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Receipt, Mail, Lock, User, Building2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    companyName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const supabase = createClient();
      
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            company_name: formData.companyName,
          },
        },
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-grid-pattern flex items-center justify-center px-6 py-12">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        </div>

        <Card variant="glass" className="max-w-md w-full p-8 relative">
          <CardContent className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">
              ตรวจสอบอีเมลของคุณ
            </h1>
            <p className="text-slate-400 mb-8">
              เราได้ส่งลิงก์ยืนยันไปยัง <span className="text-white">{formData.email}</span> 
              กรุณาคลิกลิงก์ในอีเมลเพื่อเปิดใช้งานบัญชี
            </p>
            <Link href="/auth/login">
              <Button variant="outline" className="w-full">
                กลับไปหน้าเข้าสู่ระบบ
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-grid-pattern flex items-center justify-center px-6 py-12">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Back Button */}
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับหน้าแรก
        </Link>

        <Card variant="glass" className="p-8">
          <CardContent>
            {/* Logo */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">SlipSync</span>
            </div>

            <h1 className="text-2xl font-bold text-white text-center mb-2">
              สร้างบัญชีใหม่
            </h1>
            <p className="text-slate-400 text-center mb-8">
              เริ่มต้นจัดการสลิปอย่างมืออาชีพ
            </p>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-5">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  type="text"
                  name="fullName"
                  placeholder="ชื่อ-นามสกุล"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="pl-12"
                  required
                />
              </div>

              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  type="text"
                  name="companyName"
                  placeholder="ชื่อบริษัท (ถ้ามี)"
                  value={formData.companyName}
                  onChange={handleChange}
                  className="pl-12"
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  type="email"
                  name="email"
                  placeholder="อีเมล"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-12"
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว)"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-12 pr-12"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <p className="text-xs text-slate-500">
                การสมัครสมาชิกหมายความว่าคุณยอมรับ{' '}
                <a href="#" className="text-emerald-400 hover:underline">ข้อกำหนดการใช้งาน</a>
                {' '}และ{' '}
                <a href="#" className="text-emerald-400 hover:underline">นโยบายความเป็นส่วนตัว</a>
              </p>

              <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                สมัครสมาชิก
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-slate-400">
                มีบัญชีอยู่แล้ว?{' '}
                <Link href="/auth/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
                  เข้าสู่ระบบ
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
