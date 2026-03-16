import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Upload, FileText, Trash2, Loader2, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileAttachment {
  id?: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  ai_extracted_data: any;
}

interface SectionFileUploadProps {
  analysisId: string | null;
  section: string;
  attachments: FileAttachment[];
  onAttachmentsChange: (attachments: FileAttachment[]) => void;
  onDataExtracted?: (data: any) => void;
  analysisContext?: any;
  disabled?: boolean;
}

export function SectionFileUpload({
  analysisId,
  section,
  attachments,
  onAttachmentsChange,
  onDataExtracted,
  analysisContext,
  disabled,
}: SectionFileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const filePath = `${analysisId || "temp"}/${section}/${Date.now()}_${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("analysis-attachments")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const newAttachment: FileAttachment = {
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          ai_extracted_data: null,
        };

        // If analysis already exists, save to DB
        if (analysisId) {
          const { data, error } = await supabase
            .from("credit_analysis_attachments")
            .insert({
              credit_analysis_id: analysisId,
              section,
              file_name: file.name,
              file_path: filePath,
              file_type: file.type,
              file_size: file.size,
            })
            .select("id")
            .single();

          if (error) throw error;
          newAttachment.id = data.id;
        }

        onAttachmentsChange([...attachments, newAttachment]);

        toast({ title: `${file.name} anexado com sucesso` });
      }
    } catch (err: any) {
      toast({ title: "Erro ao anexar arquivo", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async (index: number) => {
    const att = attachments[index];
    try {
      await supabase.storage.from("analysis-attachments").remove([att.file_path]);
      if (att.id) {
        await supabase.from("credit_analysis_attachments").delete().eq("id", att.id);
      }
      onAttachmentsChange(attachments.filter((_, i) => i !== index));
      toast({ title: "Arquivo removido" });
    } catch (err: any) {
      toast({ title: "Erro ao remover", description: err.message, variant: "destructive" });
    }
  };

  const handleAnalyze = async (index: number) => {
    const att = attachments[index];
    setAnalyzing(true);

    try {
      // Download file content
      const { data: fileData, error: downloadErr } = await supabase.storage
        .from("analysis-attachments")
        .download(att.file_path);

      if (downloadErr) throw downloadErr;

      // Convert to base64 for AI
      const buffer = await fileData.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

      const { data: result, error: fnError } = await supabase.functions.invoke("analyze-document", {
        body: {
          fileName: att.file_name,
          fileContent: att.file_type?.startsWith("text/") 
            ? await fileData.text() 
            : base64,
          section,
          analysisContext,
        },
      });

      if (fnError) throw fnError;

      if (result?.error) {
        toast({ title: "Erro da IA", description: result.error, variant: "destructive" });
        return;
      }

      const extractedData = result?.data;

      // Update attachment with extracted data
      const updated = [...attachments];
      updated[index] = { ...updated[index], ai_extracted_data: extractedData };
      onAttachmentsChange(updated);

      if (att.id) {
        await supabase
          .from("credit_analysis_attachments")
          .update({ ai_extracted_data: extractedData })
          .eq("id", att.id);
      }

      if (onDataExtracted && extractedData) {
        onDataExtracted(extractedData);
      }

      toast({ title: "Documento analisado pela IA", description: extractedData?.resumo_executivo?.substring(0, 100) || "Dados extraídos com sucesso" });
    } catch (err: any) {
      toast({ title: "Erro ao analisar documento", description: err.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="space-y-2">
      {/* File list */}
      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map((att, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm",
                att.ai_extracted_data
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-muted/30"
              )}
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{att.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(att.file_size)}
                  {att.ai_extracted_data && (
                    <span className="ml-2 text-primary font-medium">✓ Analisado pela IA</span>
                  )}
                </p>
              </div>
              {!disabled && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => handleAnalyze(i)}
                    disabled={analyzing}
                  >
                    {analyzing ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {att.ai_extracted_data ? "Reanalisar" : "Analisar IA"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleRemove(i)}
                  >
                    <X className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Extracted data preview */}
      {attachments.some(a => a.ai_extracted_data?.resumo_executivo) && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Resumo IA
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {attachments.find(a => a.ai_extracted_data?.resumo_executivo)?.ai_extracted_data.resumo_executivo}
          </p>
        </div>
      )}

      {/* Upload button */}
      {!disabled && (
        <div>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleUpload}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 border-dashed"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Upload className="h-3 w-3" />
            )}
            {uploading ? "Enviando..." : "Anexar Arquivo"}
          </Button>
        </div>
      )}
    </div>
  );
}
