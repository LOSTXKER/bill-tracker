'use client';

import { useState, useEffect } from 'react';
import { 
  User, 
  Building2, 
  Bell, 
  Shield, 
  Save,
  Check,
  MessageCircle,
  Copy,
  ExternalLink,
  QrCode,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedGroupId, setCopiedGroupId] = useState(false);
  
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
  });

  const [company, setCompany] = useState({
    name: '',
    tax_id: '',
    address: '',
  });

  const [lineSettings, setLineSettings] = useState({
    group_id: '',
    notifications_enabled: false,
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch('/api/profile');
        const data = await response.json();

        if (data.success && data.profile) {
          setProfile({
            full_name: data.profile.fullName || '',
            email: data.profile.email || data.email || '',
            phone: '',
          });

          if (data.profile.company) {
            setCompany({
              name: data.profile.company.name || '',
              tax_id: data.profile.company.taxId || '',
              address: data.profile.company.address || '',
            });
            
            setLineSettings({
              group_id: data.profile.company.lineGroupId || '',
              notifications_enabled: data.profile.company.lineNotifications || false,
            });
          }
        }
      } catch (error) {
        console.error('Load profile error:', error);
      }
    };

    loadProfile();
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: profile.full_name,
          company: {
            name: company.name,
            taxId: company.tax_id,
            address: company.address,
          },
          lineSettings: {
            groupId: lineSettings.group_id,
            notificationsEnabled: lineSettings.notifications_enabled,
          },
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
      } else {
        console.error('Save error:', data.error);
      }
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedGroupId(true);
    setTimeout(() => setCopiedGroupId(false), 2000);
  };

  const tabs = [
    { id: 'profile', label: 'โปรไฟล์', icon: User },
    { id: 'company', label: 'บริษัท', icon: Building2 },
    { id: 'line', label: 'Line', icon: MessageCircle },
    { id: 'notifications', label: 'การแจ้งเตือน', icon: Bell },
    { id: 'security', label: 'ความปลอดภัย', icon: Shield },
  ];

  // LINE Bot ID
  const LINE_BOT_ID = '@175ebpyn';
  const LINE_BOT_ADD_URL = `https://line.me/R/ti/p/${LINE_BOT_ID}`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">ตั้งค่า</h1>
        <p className="text-slate-400 mt-1">จัดการโปรไฟล์และการตั้งค่าระบบ</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <Card className="lg:col-span-1 h-fit">
          <CardContent className="p-4">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      activeTab === tab.id
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </CardContent>
        </Card>

        {/* Content */}
        <div className="lg:col-span-3 space-y-6">
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-400" />
                  ข้อมูลโปรไฟล์
                </CardTitle>
                <CardDescription>
                  จัดการข้อมูลส่วนตัวของคุณ
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                    <User className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <Button variant="outline" size="sm">
                      เปลี่ยนรูปโปรไฟล์
                    </Button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="ชื่อ-นามสกุล"
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  />
                  <Input
                    label="อีเมล"
                    type="email"
                    value={profile.email}
                    disabled
                    className="opacity-50"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'company' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-teal-400" />
                  ข้อมูลบริษัท
                </CardTitle>
                <CardDescription>
                  จัดการข้อมูลบริษัทของคุณ
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="ชื่อบริษัท"
                  value={company.name}
                  onChange={(e) => setCompany({ ...company, name: e.target.value })}
                />
                <Input
                  label="เลขประจำตัวผู้เสียภาษี"
                  value={company.tax_id}
                  onChange={(e) => setCompany({ ...company, tax_id: e.target.value })}
                />
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    ที่อยู่
                  </label>
                  <textarea
                    value={company.address}
                    onChange={(e) => setCompany({ ...company, address: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'line' && (
            <div className="space-y-6">
              {/* LINE Bot Setup Guide */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-green-400" />
                    เชื่อมต่อ Line Group
                  </CardTitle>
                  <CardDescription>
                    รับแจ้งเตือนสลิปใหม่ผ่าน Line Group
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Steps */}
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                        1
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-white mb-1">เพิ่ม Bot เป็นเพื่อน</h4>
                        <p className="text-sm text-slate-400 mb-3">
                          เพิ่ม SlipSync Bot เป็นเพื่อนใน Line
                        </p>
                        <a 
                          href={LINE_BOT_ADD_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                          เพิ่มเพื่อน
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                        2
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-white mb-1">เชิญ Bot เข้า Group</h4>
                        <p className="text-sm text-slate-400">
                          สร้าง Line Group หรือใช้ Group ที่มีอยู่ แล้วเชิญ Bot เข้า Group
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                        3
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-white mb-1">ดู Group ID</h4>
                        <p className="text-sm text-slate-400 mb-2">
                          พิมพ์คำสั่งใน Group เพื่อดู Group ID
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="px-3 py-2 bg-slate-800 rounded-lg text-emerald-400 font-mono">
                            !groupid
                          </code>
                          <button
                            onClick={() => copyToClipboard('!groupid')}
                            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            {copiedGroupId ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                        4
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-white mb-1">วาง Group ID</h4>
                        <p className="text-sm text-slate-400 mb-3">
                          คัดลอก Group ID จาก Line แล้ววางในช่องด้านล่าง
                        </p>
                        <Input
                          label="Line Group ID"
                          placeholder="Cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          value={lineSettings.group_id}
                          onChange={(e) => setLineSettings({ ...lineSettings, group_id: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  {lineSettings.group_id && (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <div>
                          <p className="font-medium text-emerald-400">เชื่อมต่อแล้ว</p>
                          <p className="text-sm text-slate-400">Group ID: {lineSettings.group_id.slice(0, 10)}...</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Enable Notifications */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50">
                    <div>
                      <p className="font-medium text-white">เปิดการแจ้งเตือน</p>
                      <p className="text-sm text-slate-400">ส่งข้อความเมื่อมีการอัปโหลดสลิปใหม่</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={lineSettings.notifications_enabled}
                        onChange={(e) => setLineSettings({ ...lineSettings, notifications_enabled: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* QR Code Card */}
              <Card variant="glass">
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    <div className="w-32 h-32 bg-white rounded-xl flex items-center justify-center">
                      <QrCode className="w-24 h-24 text-slate-900" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white mb-2">สแกน QR Code</h4>
                      <p className="text-sm text-slate-400 mb-4">
                        สแกนเพื่อเพิ่ม SlipSync Bot เป็นเพื่อนใน Line
                      </p>
                      <p className="text-xs text-slate-500">
                        Bot ID: {LINE_BOT_ID}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-400" />
                  การแจ้งเตือน
                </CardTitle>
                <CardDescription>
                  ตั้งค่าการแจ้งเตือนต่างๆ
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50">
                    <div>
                      <p className="font-medium text-white">แจ้งเตือนทางอีเมล</p>
                      <p className="text-sm text-slate-400">รับอีเมลเมื่อมีการอัปเดตสลิป</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50">
                    <div>
                      <p className="font-medium text-white">แจ้งเตือนทาง Line</p>
                      <p className="text-sm text-slate-400">รับข้อความ Line เมื่อมีรายการใหม่</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={lineSettings.notifications_enabled}
                        onChange={(e) => setLineSettings({ ...lineSettings, notifications_enabled: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50">
                    <div>
                      <p className="font-medium text-white">สรุปรายสัปดาห์</p>
                      <p className="text-sm text-slate-400">รับสรุปค่าใช้จ่ายทุกวันจันทร์</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-400" />
                  ความปลอดภัย
                </CardTitle>
                <CardDescription>
                  จัดการรหัสผ่านและความปลอดภัยบัญชี
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                  <h4 className="font-medium text-white mb-2">เปลี่ยนรหัสผ่าน</h4>
                  <p className="text-sm text-slate-400 mb-4">
                    เพื่อความปลอดภัย แนะนำให้เปลี่ยนรหัสผ่านทุก 3 เดือน
                  </p>
                  <Button variant="outline" size="sm">
                    เปลี่ยนรหัสผ่าน
                  </Button>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                  <h4 className="font-medium text-white mb-2">Two-Factor Authentication</h4>
                  <p className="text-sm text-slate-400 mb-4">
                    เพิ่มความปลอดภัยด้วยการยืนยันตัวตน 2 ขั้นตอน
                  </p>
                  <Button variant="outline" size="sm">
                    เปิดใช้งาน 2FA
                  </Button>
                </div>

                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <h4 className="font-medium text-red-400 mb-2">ลบบัญชี</h4>
                  <p className="text-sm text-slate-400 mb-4">
                    การลบบัญชีจะลบข้อมูลทั้งหมดของคุณอย่างถาวร
                  </p>
                  <Button variant="danger" size="sm">
                    ลบบัญชี
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Save Button */}
          <div className="flex items-center justify-end gap-4">
            {isSaved && (
              <div className="flex items-center gap-2 text-emerald-400">
                <Check className="w-5 h-5" />
                <span>บันทึกแล้ว</span>
              </div>
            )}
            <Button onClick={handleSave} isLoading={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              บันทึกการเปลี่ยนแปลง
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
