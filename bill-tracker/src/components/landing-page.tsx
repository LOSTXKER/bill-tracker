"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Receipt,
  FileText,
  Bell,
  ChartLine,
  Shield,
  Smartphone,
  ArrowRight,
} from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />

      {/* Navigation */}
      <nav className="relative z-10 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Bill Tracker</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10">
                เข้าสู่ระบบ
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white">
                สมัครใช้งาน
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Mini-ERP สำหรับธุรกิจ SME
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            จัดการเอกสารบัญชี
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              และภาษีอย่างเป็นระบบ
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            ติดตามรายรับ-รายจ่าย จัดการใบกำกับภาษี ภาษีหัก ณ ที่จ่าย
            และส่งเอกสารให้บัญชีได้อย่างไม่ตกหล่น
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-lg h-14 px-8 shadow-lg shadow-emerald-500/25"
              >
                เริ่มต้นใช้งานฟรี
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto text-white border-slate-600 hover:bg-white/10 text-lg h-14 px-8"
              >
                เข้าสู่ระบบ
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 px-4 sm:px-6 py-16 sm:py-24 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              ฟีเจอร์ครบครัน
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              ออกแบบมาเพื่อธุรกิจ SME โดยเฉพาะ ใช้งานง่าย ครอบคลุมทุกความต้องการ
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <Card
                key={i}
                className="p-6 bg-slate-800/50 border-slate-700/50 hover:border-emerald-500/50 transition-colors"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br ${feature.gradient}`}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <Card className="p-8 sm:p-12 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              พร้อมเริ่มต้นจัดการเอกสารของคุณ?
            </h2>
            <p className="text-slate-400 mb-8 max-w-xl mx-auto">
              เริ่มใช้งานได้ทันที ไม่ต้องติดตั้งโปรแกรม เข้าถึงได้ทุกที่ทุกเวลา
            </p>
            <Link href="/register">
              <Button
                size="lg"
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-lg h-14 px-8 shadow-lg shadow-emerald-500/25"
              >
                สมัครใช้งานฟรี
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-4 sm:px-6 py-8 border-t border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg flex items-center justify-center">
              <Receipt className="w-4 h-4 text-white" />
            </div>
            <span className="text-slate-400 text-sm">
              Bill Tracker & Mini-ERP System
            </span>
          </div>
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: Receipt,
    title: "บันทึกรายรับ-รายจ่าย",
    description: "บันทึกได้รวดเร็ว คำนวณ VAT และภาษีหัก ณ ที่จ่ายอัตโนมัติ",
    gradient: "from-blue-500 to-blue-600",
  },
  {
    icon: FileText,
    title: "ติดตามเอกสาร",
    description: "ไม่พลาดใบเสร็จ ใบกำกับภาษี และใบ 50 ทวิ ที่ต้องส่งบัญชี",
    gradient: "from-purple-500 to-purple-600",
  },
  {
    icon: Bell,
    title: "แจ้งเตือน LINE",
    description: "แจ้งเตือนทันทีเมื่อมีรายการใหม่ หรือเอกสารที่ต้องทวง",
    gradient: "from-green-500 to-green-600",
  },
  {
    icon: ChartLine,
    title: "รายงานภาษี",
    description: "สรุป VAT และ WHT พร้อม Export สำหรับยื่น ภ.พ.30, ภ.ง.ด.53",
    gradient: "from-orange-500 to-orange-600",
  },
  {
    icon: Shield,
    title: "ปลอดภัย",
    description: "ข้อมูลเข้ารหัส เก็บบน Cloud ที่เชื่อถือได้ สำรองข้อมูลอัตโนมัติ",
    gradient: "from-red-500 to-red-600",
  },
  {
    icon: Smartphone,
    title: "ใช้งานได้ทุกอุปกรณ์",
    description: "ออกแบบมาสำหรับมือถือ ถ่ายรูปบิลและอัพโหลดได้ทันที",
    gradient: "from-teal-500 to-teal-600",
  },
];
