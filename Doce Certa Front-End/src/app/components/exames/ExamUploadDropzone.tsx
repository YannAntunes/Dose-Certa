import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, FileText, X, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';

interface ExamUploadDropzoneProps {
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  onUpload: () => void;
  uploading: boolean;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function ExamUploadDropzone({
  selectedFile,
  onFileSelect,
  onUpload,
  uploading,
  disabled = false,
}: ExamUploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const validateAndSetFile = (file: File) => {
    setValidationError(null);

    // Validação de tipo: somente PDF
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setValidationError('Formato inválido. Apenas arquivos PDF de laudos laboratoriais são aceitos.');
      return;
    }

    // Validação de arquivo vazio
    if (file.size === 0) {
      setValidationError('O arquivo selecionado está vazio (0 bytes).');
      return;
    }

    // Validação de tamanho máximo (10MB)
    if (file.size > MAX_FILE_SIZE) {
      setValidationError(
        `Arquivo muito grande (${formatFileSize(file.size)}). O limite máximo suportado pelo sistema é 10 MB.`
      );
      return;
    }

    onFileSelect(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !uploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled || uploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndSetFile(file);
    }
  };

  const handleRemoveFile = () => {
    onFileSelect(null);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClickZone = () => {
    if (!disabled && !uploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled && !uploading) {
      e.preventDefault();
      handleClickZone();
    }
  };

  return (
    <div className="space-y-4">
      {/* Input de arquivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleFileInputChange}
        disabled={disabled || uploading}
        aria-label="Selecionar arquivo PDF de exame"
      />

      {/* Área ampla de arrastar e soltar (Inspirada na 1ª Imagem de Referência) */}
      {!selectedFile ? (
        <div
          role="button"
          tabIndex={disabled || uploading ? -1 : 0}
          onClick={handleClickZone}
          onKeyDown={handleKeyDown}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-10 md:p-14 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-4 ${
            disabled
              ? 'opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40'
              : isDragOver
              ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 scale-[1.01] shadow-lg shadow-blue-500/10'
              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/60 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-50/80 dark:hover:bg-slate-900/90 shadow-sm'
          }`}
        >
          {/* Ícone de envio grande central */}
          <div
            className={`w-18 h-18 rounded-2xl flex items-center justify-center transition-transform duration-300 ${
              isDragOver
                ? 'scale-110 bg-blue-500 text-white shadow-xl shadow-blue-500/30'
                : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
            }`}
          >
            <UploadCloud className="w-10 h-10" />
          </div>

          <div className="space-y-1.5 max-w-md">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Enviar exames laboratoriais
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Arraste e solte o arquivo PDF aqui ou{' '}
              <span className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                clique para selecionar
              </span>
            </p>
          </div>

          {/* Badges de restrições */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700">
              Formato: PDF
            </Badge>
            <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700">
              Tamanho máx: 10 MB
            </Badge>
            <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700">
              Documentos com camada de texto
            </Badge>
          </div>
        </div>
      ) : (
        /* Card do arquivo selecionado */
        <Card className="border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                      {selectedFile.name}
                    </p>
                    <Badge variant="secondary" className="text-xs font-medium bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                      PDF
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatFileSize(selectedFile.size)} • Pronto para processamento
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  disabled={uploading}
                  className="text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  <X className="w-4 h-4 mr-1" />
                  Substituir
                </Button>

                <Button
                  type="button"
                  onClick={onUpload}
                  disabled={uploading || disabled}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md shadow-blue-600/20"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Enviando exame...
                    </>
                  ) : (
                    <>
                      Enviar exame
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensagem de erro de validação */}
      {validationError && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
}
