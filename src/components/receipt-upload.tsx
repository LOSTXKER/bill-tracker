'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileImage, FileText, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

interface ReceiptUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  isUploading?: boolean;
}

export function ReceiptUpload({ onUpload, isUploading }: ReceiptUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
    
    // Create previews for images
    acceptedFiles.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          setPreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviews((prev) => [...prev, '']);
      }
    });
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    await onUpload(files);
    setFiles([]);
    setPreviews([]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: isUploading,
  });

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300',
          isDragActive
            ? 'border-emerald-500 bg-emerald-500/10'
            : 'border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800/50',
          isUploading && 'pointer-events-none opacity-50'
        )}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            'w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300',
            isDragActive
              ? 'bg-emerald-500/20 text-emerald-400 scale-110'
              : 'bg-slate-800 text-slate-400'
          )}>
            <Upload className="w-10 h-10" />
          </div>
          
          <div>
            <p className="text-lg font-medium text-white mb-1">
              {isDragActive ? 'วางไฟล์ที่นี่' : 'อัปโหลดสลิป'}
            </p>
            <p className="text-slate-400 text-sm">
              ลากไฟล์มาวาง หรือ <span className="text-emerald-400">คลิกเพื่อเลือก</span>
            </p>
            <p className="text-slate-500 text-xs mt-2">
              รองรับ JPG, PNG, PDF (สูงสุด 10MB)
            </p>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-teal-500/5 rounded-full blur-3xl" />
        </div>
      </div>

      {/* File Previews */}
      {files.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-slate-300">
            ไฟล์ที่เลือก ({files.length})
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {files.map((file, index) => (
              <div
                key={index}
                className="relative group bg-slate-800 rounded-xl overflow-hidden border border-slate-700"
              >
                {previews[index] ? (
                  <img
                    src={previews[index]}
                    alt={file.name}
                    className="w-full h-32 object-cover"
                  />
                ) : (
                  <div className="w-full h-32 flex items-center justify-center bg-slate-800">
                    {file.type === 'application/pdf' ? (
                      <FileText className="w-12 h-12 text-red-400" />
                    ) : (
                      <FileImage className="w-12 h-12 text-slate-400" />
                    )}
                  </div>
                )}
                
                <div className="p-2">
                  <p className="text-xs text-slate-400 truncate">{file.name}</p>
                  <p className="text-xs text-slate-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>

                <button
                  onClick={() => removeFile(index)}
                  className="absolute top-2 right-2 p-1 bg-red-500/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}
          </div>

          <Button
            onClick={handleUpload}
            isLoading={isUploading}
            className="w-full"
            size="lg"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                กำลังอัปโหลด...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                อัปโหลด {files.length} ไฟล์
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
