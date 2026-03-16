
-- Storage bucket for analysis attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('analysis-attachments', 'analysis-attachments', true);

-- Attachments table linked to analysis sections
CREATE TABLE public.credit_analysis_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_analysis_id UUID NOT NULL REFERENCES public.credit_analysis(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  ai_extracted_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AI insights table
CREATE TABLE public.credit_analysis_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_analysis_id UUID NOT NULL REFERENCES public.credit_analysis(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  section TEXT,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE public.credit_analysis_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_analysis_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to attachments" ON public.credit_analysis_attachments FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to insights" ON public.credit_analysis_insights FOR ALL TO public USING (true) WITH CHECK (true);

-- Storage RLS
CREATE POLICY "Allow all uploads to analysis-attachments" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'analysis-attachments');
CREATE POLICY "Allow all reads from analysis-attachments" ON storage.objects FOR SELECT TO public USING (bucket_id = 'analysis-attachments');
CREATE POLICY "Allow all deletes from analysis-attachments" ON storage.objects FOR DELETE TO public USING (bucket_id = 'analysis-attachments');
