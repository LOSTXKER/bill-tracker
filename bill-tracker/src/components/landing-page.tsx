"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Receipt,
  FileText,
  Bell,
  ChartLine,
  Shield,
  Smartphone,
  ArrowRight,
  Check,
} from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
              <Receipt className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">Bill Tracker</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                เข้าสู่ระบบ
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                สมัครใช้งาน
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-fade-in-down">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <span className="w-1.5 h-1.5 bg-primary rounded-full pulse-subtle" />
              Mini-ERP สำหรับธุรกิจ SME
            </span>
          </div>

          <h1 className="mt-8 text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            จัดการเอกสารบัญชี
            <br />
            <span className="text-primary">และภาษีอย่างเป็นระบบ</span>
          </h1>

          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            ติดตามรายรับ-รายจ่าย จัดการใบกำกับภาษี ภาษีหัก ณ ที่จ่าย
            และส่งเอกสารให้บัญชีได้อย่างไม่ตกหล่น
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: "300ms" }}>
            <Link href="/register">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground h-12 px-8 text-base font-medium"
              >
                เริ่มต้นใช้งานฟรี
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-12 px-8 text-base font-medium"
              >
                เข้าสู่ระบบ
              </Button>
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: "400ms" }}>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span>ไม่ต้องติดตั้ง</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span>เริ่มต้นฟรี</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span>ข้อมูลปลอดภัย</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground">
              ฟีเจอร์ครบครัน
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              ออกแบบมาเพื่อธุรกิจ SME โดยเฉพาะ ใช้งานง่าย ครอบคลุมทุกความต้องการ
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-elevated transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-primary/10 text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground">
              ใช้งานง่ายใน 3 ขั้นตอน
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-lg flex items-center justify-center mx-auto mb-4">
                  {i + 1}
                </div>
                <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="p-8 sm:p-12 rounded-3xl bg-primary/5 border border-primary/10 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              พร้อมเริ่มต้นจัดการเอกสารของคุณ?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              เริ่มใช้งานได้ทันที ไม่ต้องติดตั้งโปรแกรม เข้าถึงได้ทุกที่ทุกเวลา
            </p>
            <Link href="/register">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground h-12 px-8 text-base font-medium"
              >
                สมัครใช้งานฟรี
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 border-t border-border/50">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <Receipt className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">
              Bill Tracker & Mini-ERP System
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
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
  },
  {
    icon: FileText,
    title: "ติดตามเอกสาร",
    description: "ไม่พลาดใบเสร็จ ใบกำกับภาษี และใบ 50 ทวิ ที่ต้องส่งบัญชี",
  },
  {
    icon: Bell,
    title: "แจ้งเตือน LINE",
    description: "แจ้งเตือนทันทีเมื่อมีรายการใหม่ หรือเอกสารที่ต้องทวง",
  },
  {
    icon: ChartLine,
    title: "รายงานภาษี",
    description: "สรุป VAT และ WHT พร้อม Export สำหรับยื่น ภ.พ.30, ภ.ง.ด.53",
  },
  {
    icon: Shield,
    title: "ปลอดภัย",
    description: "ข้อมูลเข้ารหัส เก็บบน Cloud ที่เชื่อถือได้ สำรองข้อมูลอัตโนมัติ",
  },
  {
    icon: Smartphone,
    title: "ใช้งานได้ทุกอุปกรณ์",
    description: "ออกแบบมาสำหรับมือถือ ถ่ายรูปบิลและอัพโหลดได้ทันที",
  },
];

const steps = [
  {
    title: "สมัครใช้งาน",
    description: "สร้างบัญชีและเพิ่มข้อมูลบริษัทของคุณ",
  },
  {
    title: "บันทึกรายการ",
    description: "ถ่ายรูปหรือกรอกข้อมูลรายรับ-รายจ่าย",
  },
  {
    title: "ติดตามและส่งออก",
    description: "ดูรายงานและส่งเอกสารให้บัญชี",
  },
];
