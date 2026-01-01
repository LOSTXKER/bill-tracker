'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Sparkles, 
  Check, 
  AlertCircle,
  Calendar,
  Store,
  Receipt,
  Tag,
  FileText,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReceiptUpload } from '@/components/receipt-upload';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';

interface AIExtractedData {
  vendor_name: string;
  amount: number;
  vat_amount?: number;
  total_amount: number;
  has_vat: boolean;
  receipt_date: string;
  suggested_category: string;
  confidence: number;
}

interface UploadedReceipt {
  file: File;
  preview: string;
  aiData?: AIExtractedData;
  isAnalyzing: boolean;
  error?: string;
}

export default function UploadPage() {
  const router = useRouter();
  const [uploadedReceipts, setUploadedReceipts] = useState<UploadedReceipt[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<'upload' | 'review' | 'complete'>('upload');

  const analyzeWithGemini = async (file: File, index: number) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/receipts/analyze', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.data) {
        setUploadedReceipts((prev) => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            isAnalyzing: false,
            aiData: {
              vendor_name: result.data.vendor_name,
              amount: result.data.amount,
              vat_amount: result.data.vat_amount,
              total_amount: result.data.total_amount,
              has_vat: result.data.has_vat,
              receipt_date: result.data.receipt_date,
              suggested_category: result.data.suggested_category,
              confidence: result.data.confidence,
            },
          };
          return updated;
        });
      } else {
        throw new Error(result.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setUploadedReceipts((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          isAnalyzing: false,
          error: 'ไม่สามารถวิเคราะห์ได้',
        };
        return updated;
      });
    }
  };

  const handleUpload = async (files: File[]) => {
    // Create preview URLs and initialize receipts
    const startIndex = uploadedReceipts.length;
    const newReceipts: UploadedReceipt[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      isAnalyzing: true,
    }));

    setUploadedReceipts((prev) => [...prev, ...newReceipts]);
    setCurrentStep('review');

    // Analyze each file with Gemini AI
    for (let i = 0; i < files.length; i++) {
      analyzeWithGemini(files[i], startIndex + i);
    }
  };

  const updateReceiptData = (index: number, field: string, value: string | number | boolean) => {
    setUploadedReceipts((prev) => {
      const updated = [...prev];
      if (updated[index].aiData) {
        updated[index].aiData = {
          ...updated[index].aiData!,
          [field]: value,
        };
      }
      return updated;
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      // Get user profile with company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('No company associated with user');
      }

      // Upload each receipt
      for (const receipt of uploadedReceipts) {
        if (!receipt.aiData) continue;

        // Upload file to storage
        const fileName = `${user.id}/${Date.now()}-${receipt.file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, receipt.file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('receipts')
          .getPublicUrl(fileName);

        // Insert receipt record
        const { error: insertError } = await supabase
          .from('receipts')
          .insert({
            company_id: profile.company_id,
            uploaded_by: user.id,
            image_url: publicUrl,
            file_type: receipt.file.type.includes('pdf') ? 'pdf' : 'image',
            vendor_name: receipt.aiData.vendor_name,
            amount: receipt.aiData.amount,
            vat_amount: receipt.aiData.vat_amount,
            total_amount: receipt.aiData.total_amount,
            has_vat: receipt.aiData.has_vat,
            receipt_date: receipt.aiData.receipt_date,
            ai_confidence: receipt.aiData.confidence,
            status: 'pending',
            period_month: new Date().getMonth() + 1,
            period_year: new Date().getFullYear(),
          });

        if (insertError) {
          console.error('Insert error:', insertError);
        }
      }

      setCurrentStep('complete');
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeReceipt = (index: number) => {
    setUploadedReceipts((prev) => prev.filter((_, i) => i !== index));
    if (uploadedReceipts.length === 1) {
      setCurrentStep('upload');
    }
  };

  if (currentStep === 'complete') {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6 animate-bounce">
          <Check className="w-10 h-10 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">อัปโหลดสำเร็จ!</h1>
        <p className="text-slate-400 mb-8">
          บันทึกสลิป {uploadedReceipts.length} รายการเรียบร้อยแล้ว
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/dashboard/receipts">
            <Button variant="outline" size="lg">
              <FileText className="w-5 h-5 mr-2" />
              ดูรายการสลิป
            </Button>
          </Link>
          <Button 
            size="lg" 
            onClick={() => {
              setUploadedReceipts([]);
              setCurrentStep('upload');
            }}
          >
            อัปโหลดเพิ่ม
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            กลับ
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">อัปโหลดสลิป</h1>
          <p className="text-slate-400">อัปโหลดสลิปและให้ Gemini AI ช่วยอ่านข้อมูล</p>
        </div>
      </div>

      {/* Steps Indicator */}
      {(currentStep as string) !== 'complete' && (
        <div className="flex items-center justify-center gap-4">
          <div className={`flex items-center gap-2 ${currentStep === 'upload' ? 'text-emerald-400' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'upload' ? 'bg-emerald-500/20' : 'bg-slate-800'}`}>
              1
            </div>
            <span className="hidden sm:inline">อัปโหลด</span>
          </div>
          <div className="w-8 h-0.5 bg-slate-700" />
          <div className={`flex items-center gap-2 ${currentStep === 'review' ? 'text-emerald-400' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'review' ? 'bg-emerald-500/20' : 'bg-slate-800'}`}>
              2
            </div>
            <span className="hidden sm:inline">ตรวจสอบ</span>
          </div>
        </div>
      )}

      {/* Upload Area */}
      {currentStep === 'upload' && (
        <Card variant="glass">
          <CardContent className="py-8">
            <ReceiptUpload onUpload={handleUpload} />
          </CardContent>
        </Card>
      )}

      {/* Review Area */}
      {currentStep === 'review' && (
        <div className="space-y-6">
          {/* AI Info Banner */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <p className="text-sm text-emerald-300">
              Gemini AI กำลังอ่านข้อมูลจากสลิปของคุณ กรุณาตรวจสอบความถูกต้องก่อนบันทึก
            </p>
          </div>

          {/* Receipt Cards */}
          <div className="grid gap-6">
            {uploadedReceipts.map((receipt, index) => (
              <Card key={index} variant="glass">
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Preview Image */}
                    <div className="relative aspect-[3/4] bg-slate-800 rounded-xl overflow-hidden">
                      {receipt.file.type.includes('pdf') ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <FileText className="w-16 h-16 text-red-400 mb-2" />
                          <p className="text-slate-400 text-sm">{receipt.file.name}</p>
                        </div>
                      ) : (
                        <img 
                          src={receipt.preview} 
                          alt="Receipt preview"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      )}
                      
                      {receipt.isAnalyzing && (
                        <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center">
                          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-2" />
                          <p className="text-emerald-400 text-sm">Gemini กำลังอ่าน...</p>
                        </div>
                      )}
                    </div>

                    {/* Extracted Data */}
                    <div className="md:col-span-2 space-y-4">
                      {receipt.isAnalyzing ? (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center">
                            <Sparkles className="w-12 h-12 text-emerald-400 mx-auto mb-4 animate-pulse" />
                            <p className="text-slate-400">กำลังวิเคราะห์ด้วย Gemini AI...</p>
                          </div>
                        </div>
                      ) : receipt.error ? (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center">
                            <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                            <p className="text-amber-400">{receipt.error}</p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-4"
                              onClick={() => {
                                setUploadedReceipts((prev) => {
                                  const updated = [...prev];
                                  updated[index].isAnalyzing = true;
                                  updated[index].error = undefined;
                                  return updated;
                                });
                                analyzeWithGemini(receipt.file, index);
                              }}
                            >
                              ลองใหม่
                            </Button>
                          </div>
                        </div>
                      ) : receipt.aiData ? (
                        <>
                          <div className="flex items-center justify-between">
                            <Badge variant="success">
                              <Sparkles className="w-3 h-3 mr-1" />
                              ความมั่นใจ {receipt.aiData.confidence}%
                            </Badge>
                            <button 
                              onClick={() => removeReceipt(index)}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              ลบ
                            </button>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <label className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                                <Store className="w-4 h-4" />
                                ร้านค้า
                              </label>
                              <Input
                                value={receipt.aiData.vendor_name}
                                onChange={(e) => updateReceiptData(index, 'vendor_name', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                                <Calendar className="w-4 h-4" />
                                วันที่
                              </label>
                              <Input
                                type="date"
                                value={receipt.aiData.receipt_date}
                                onChange={(e) => updateReceiptData(index, 'receipt_date', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                                <Receipt className="w-4 h-4" />
                                จำนวนเงิน
                              </label>
                              <Input
                                type="number"
                                value={receipt.aiData.total_amount}
                                onChange={(e) => updateReceiptData(index, 'total_amount', parseFloat(e.target.value))}
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                                <Tag className="w-4 h-4" />
                                หมวดหมู่
                              </label>
                              <Input
                                value={receipt.aiData.suggested_category}
                                onChange={(e) => updateReceiptData(index, 'suggested_category', e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-4 pt-4 border-t border-slate-700">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={receipt.aiData.has_vat}
                                onChange={(e) => updateReceiptData(index, 'has_vat', e.target.checked)}
                                className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                              />
                              <span className="text-sm text-slate-300">มี VAT</span>
                            </label>
                            {receipt.aiData.has_vat && receipt.aiData.vat_amount && (
                              <span className="text-sm text-slate-400">
                                VAT: {formatCurrency(receipt.aiData.vat_amount)}
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-3 text-amber-400">
                          <AlertCircle className="w-5 h-5" />
                          <p>ไม่สามารถอ่านข้อมูลได้</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep('upload')}
            >
              อัปโหลดเพิ่ม
            </Button>
            <Button 
              size="lg" 
              onClick={handleSubmit}
              isLoading={isSubmitting}
              disabled={uploadedReceipts.some(r => r.isAnalyzing) || uploadedReceipts.every(r => r.error)}
            >
              <Check className="w-5 h-5 mr-2" />
              ยืนยันและบันทึก ({uploadedReceipts.filter(r => r.aiData).length} รายการ)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
