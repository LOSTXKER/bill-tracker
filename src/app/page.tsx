import Link from 'next/link';
import { 
  Receipt, 
  Brain, 
  BarChart3, 
  MessageSquare, 
  ArrowRight,
  Shield,
  Zap,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-grid-pattern">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">SlipSync</span>
            </div>
            
            <div className="flex items-center gap-4">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">เข้าสู่ระบบ</Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm">เริ่มต้นใช้งาน</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">AI-Powered Receipt Management</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="text-white">จัดการสลิปง่าย</span>
              <br />
              <span className="text-gradient">ด้วยพลัง AI</span>
            </h1>

            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
              ถ่ายรูปสลิป ให้ AI อ่านข้อมูลอัตโนมัติ ส่งต่อทีมบัญชีแบบ Real-time 
              ไม่มีสลิปตกหล่น ไม่ต้องอธิบายซ้ำ
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link href="/auth/register">
                <Button size="lg" className="group">
                  เริ่มใช้งานฟรี
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg">
                  ดูฟีเจอร์ทั้งหมด
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-xl mx-auto">
              <div>
                <div className="text-3xl font-bold text-gradient mb-1">&lt; 1 นาที</div>
                <div className="text-sm text-slate-500">ต่อสลิป</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gradient mb-1">95%</div>
                <div className="text-sm text-slate-500">ความแม่นยำ AI</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gradient mb-1">0</div>
                <div className="text-sm text-slate-500">สลิปตกหล่น</div>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Image Placeholder */}
        <div className="max-w-5xl mx-auto mt-20">
          <div className="relative rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl shadow-emerald-500/10">
            <div className="aspect-[16/9] bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
              <div className="text-center">
                <Receipt className="w-20 h-20 text-emerald-500/50 mx-auto mb-4" />
                <p className="text-slate-500">Dashboard Preview</p>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1a] via-transparent to-transparent" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              ทำไมต้อง SlipSync?
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              ออกแบบมาเพื่อ CEO ที่ต้องการความสะดวกสบาย และทีมบัญชีที่ต้องการความถูกต้อง
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="group p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-emerald-500/50 transition-all duration-300 hover:glow">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Brain className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">AI อ่านสลิปอัตโนมัติ</h3>
              <p className="text-slate-400 text-sm">
                ระบบ OCR + AI แยกข้อมูลร้านค้า, วันที่, จำนวนเงิน, VAT ให้อัตโนมัติ
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-teal-500/50 transition-all duration-300 hover:glow">
              <div className="w-14 h-14 rounded-xl bg-teal-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Clock className="w-7 h-7 text-teal-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">ประหยัดเวลา</h3>
              <p className="text-slate-400 text-sm">
                จากเดิม 5 นาที เหลือไม่ถึง 1 นาทีต่อสลิป ไม่ต้องพิมพ์อธิบาย
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-cyan-500/50 transition-all duration-300 hover:glow">
              <div className="w-14 h-14 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-7 h-7 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">แจ้งเตือนทาง Line</h3>
              <p className="text-slate-400 text-sm">
                ทีมบัญชีรับแจ้งเตือนทันที พร้อมลิงก์ดูรายละเอียด Real-time
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-amber-500/50 transition-all duration-300 hover:glow">
              <div className="w-14 h-14 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-7 h-7 text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Dashboard สรุปผล</h3>
              <p className="text-slate-400 text-sm">
                ดูภาพรวมค่าใช้จ่ายตามหมวด ตามเดือน ได้ทันที
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-slate-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              ใช้งานง่ายใน 3 ขั้นตอน
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative">
              <div className="absolute -left-4 top-0 w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-xl font-bold text-white">
                1
              </div>
              <div className="pl-12 pt-2">
                <h3 className="text-xl font-semibold text-white mb-3">ถ่ายรูปสลิป</h3>
                <p className="text-slate-400">
                  ถ่ายรูปหรืออัปโหลดไฟล์สลิป รองรับทั้งรูปภาพและ PDF
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="absolute -left-4 top-0 w-12 h-12 rounded-full bg-teal-500 flex items-center justify-center text-xl font-bold text-white">
                2
              </div>
              <div className="pl-12 pt-2">
                <h3 className="text-xl font-semibold text-white mb-3">AI อ่านข้อมูล</h3>
                <p className="text-slate-400">
                  ระบบ AI แยกข้อมูลจากสลิปให้อัตโนมัติ พร้อมแนะนำหมวดค่าใช้จ่าย
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="absolute -left-4 top-0 w-12 h-12 rounded-full bg-cyan-500 flex items-center justify-center text-xl font-bold text-white">
                3
              </div>
              <div className="pl-12 pt-2">
                <h3 className="text-xl font-semibold text-white mb-3">ยืนยันและส่งต่อ</h3>
                <p className="text-slate-400">
                  ตรวจสอบความถูกต้อง กดยืนยัน ระบบส่งต่อทีมบัญชีทันที
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold mb-1">ปลอดภัยสูงสุด</h4>
                <p className="text-slate-400 text-sm">
                  ข้อมูลเข้ารหัส SSL และจัดเก็บแยกตามบริษัท ด้วย Row Level Security
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-teal-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold mb-1">เรียนรู้ตลอดเวลา</h4>
                <p className="text-slate-400 text-sm">
                  AI จดจำร้านประจำและรูปแบบการใช้จ่าย แม่นยำขึ้นทุกวัน
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold mb-1">พร้อมต่อยอด</h4>
                <p className="text-slate-400 text-sm">
                  Export ข้อมูลเชื่อมต่อโปรแกรมบัญชีหรือ ERP ได้ในอนาคต
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-teal-700" />
            <div className="absolute inset-0 bg-grid-pattern opacity-20" />
            
            <div className="relative p-12 md:p-16 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                พร้อมประหยัดเวลาหรือยัง?
              </h2>
              <p className="text-emerald-100 mb-8 max-w-xl mx-auto">
                เริ่มใช้งาน SlipSync วันนี้ ทดลองใช้ฟรี ไม่ต้องใส่บัตรเครดิต
              </p>
              <Link href="/auth/register">
                <Button size="lg" className="bg-white text-emerald-700 hover:bg-emerald-50">
                  สมัครใช้งานฟรี
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-white">SlipSync</span>
            </div>
            <p className="text-slate-500 text-sm">
              © 2026 SlipSync. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
