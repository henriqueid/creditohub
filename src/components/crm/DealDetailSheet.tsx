import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DealDetailContent } from "./DealDetailContent";
import { T } from "@/lib/tokens";

interface DealDetailSheetProps {
  dealId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DealDetailSheet({ dealId, open, onOpenChange }: DealDetailSheetProps) {
  const navigate = useNavigate();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[640px] overflow-y-auto p-0"
        style={{ background: "var(--off, #F7F7F2)" }}
      >
        <SheetHeader
          className="px-5 py-4 sticky top-0 z-10"
          style={{ background: T.white, borderBottom: `1px solid ${T.border}` }}
        >
          <div className="flex items-center justify-between gap-2">
            <SheetTitle style={{ fontSize: 14, fontWeight: 600, color: T.text }}>
              Detalhe da oportunidade
            </SheetTitle>
            {dealId && (
              <button
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/crm/deal/${dealId}`);
                }}
                className="flex items-center gap-1 text-[11px] hover:opacity-70 transition-opacity"
                style={{ color: T.textMute }}
              >
                Abrir página
                <ExternalLink style={{ width: 11, height: 11 }} />
              </button>
            )}
          </div>
        </SheetHeader>
        <div className="p-4">
          {dealId && <DealDetailContent dealId={dealId} variant="sheet" />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
