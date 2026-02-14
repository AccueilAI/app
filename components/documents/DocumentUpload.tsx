'use client';

import { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import type { DocumentAnalysis } from '@/lib/documents/types';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

interface DocumentUploadProps {
  language: string;
  onAnalysisComplete: (result: DocumentAnalysis) => void;
}

export function DocumentUpload({
  language,
  onAnalysisComplete,
}: DocumentUploadProps) {
  const t = useTranslations('Documents');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (f: File): string | null => {
      if (f.size > MAX_FILE_SIZE) return t('errors.fileTooLarge');
      if (!ALLOWED_TYPES.includes(f.type)) return t('errors.unsupportedFormat');
      return null;
    },
    [t],
  );

  const handleFile = useCallback(
    (f: File) => {
      const validationError = validateFile(f);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      setFile(f);

      if (f.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(f);
      } else {
        setPreview(null);
      }
    },
    [validateFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) handleFile(selected);
    },
    [handleFile],
  );

  const clearFile = useCallback(() => {
    setFile(null);
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', language);

      const res = await fetch('/api/documents/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'daily_limit') {
          setError(t('errors.dailyLimit'));
        } else if (data.error === 'file_too_large') {
          setError(t('errors.fileTooLarge'));
        } else if (data.error === 'unsupported_format') {
          setError(t('errors.unsupportedFormat'));
        } else {
          setError(t('errors.analysisFailed'));
        }
        return;
      }

      onAnalysisComplete(data as DocumentAnalysis);
      clearFile();
    } catch {
      setError(t('errors.analysisFailed'));
    } finally {
      setIsAnalyzing(false);
    }
  }, [file, language, t, onAnalysisComplete, clearFile]);

  return (
    <div className="space-y-4">
      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 transition-colors ${
            isDragging
              ? 'border-[#2B4C8C] bg-[#EEF2F9]'
              : 'border-[#E5E3DE] bg-white hover:border-[#2B4C8C]/50 hover:bg-[#FAFAF8]'
          }`}
          onClick={() => inputRef.current?.click()}
        >
          <Upload
            className={`mb-3 h-8 w-8 ${isDragging ? 'text-[#2B4C8C]' : 'text-[#5C5C6F]'}`}
          />
          <p className="text-sm font-medium text-[#1A1A2E]">
            {t('upload.dropzone')}
          </p>
          <p className="mt-1 text-xs text-[#5C5C6F]">{t('upload.or')}</p>
          <button
            type="button"
            className="mt-2 rounded-lg bg-[#2B4C8C] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1E3A6E]"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            {t('upload.selectFile')}
          </button>
          <p className="mt-3 text-xs text-[#5C5C6F]">
            {t('upload.supportedFormats')} · {t('upload.maxSize')}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="rounded-xl border border-[#E5E3DE] bg-white p-4">
          <div className="flex items-center gap-4">
            {preview ? (
              <img
                src={preview}
                alt={file.name}
                className="h-16 w-16 rounded-lg border border-[#E5E3DE] object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-[#E5E3DE] bg-[#EEF2F9]">
                <FileText className="h-8 w-8 text-[#2B4C8C]" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#1A1A2E]">
                {file.name}
              </p>
              <p className="text-xs text-[#5C5C6F]">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {!isAnalyzing && (
              <button
                onClick={clearFile}
                className="rounded-md p-1 text-[#5C5C6F] transition-colors hover:bg-[#FAFAF8] hover:text-[#1A1A2E]"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#2B4C8C] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1E3A6E] disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('analyzing')}
              </>
            ) : (
              t('upload.analyze')
            )}
          </button>
        </div>
      )}

      {error && (
        <p className="text-center text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
