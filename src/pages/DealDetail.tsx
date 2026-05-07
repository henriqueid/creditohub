import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/trilho/PageHeader";
import { DealDetailContent } from "@/components/crm/DealDetailContent";
import { T } from "@/lib/tokens";

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    return (
      <div className="p-7">
        <p style={{ fontSize: 13, color: T.textMute }}>Oportunidade não encontrada.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "calc(100vh - 68px)", background: "var(--off)" }}>
      <div className="px-4 sm:px-7 pt-4 sm:pt-7">
        <PageHeader
          title="Oportunidade"
          subtitle="DETALHE COMERCIAL"
          actions={
            <button
              onClick={() => navigate("/crm/pipeline")}
              className="flex items-center gap-2 px-3 py-[7px] rounded-[999px] text-[12px] font-medium transition-colors hover:opacity-80"
              style={{ background: T.white, color: T.text, border: `1px solid ${T.border}` }}
            >
              <ArrowLeft style={{ width: 13, height: 13 }} />
              Voltar ao Pipeline
            </button>
          }
        />
      </div>
      <DealDetailContent dealId={id} variant="page" />
    </div>
  );
}
