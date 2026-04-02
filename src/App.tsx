import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/Clients";
import ClientForm from "@/pages/ClientForm";
import CreditAnalysisList from "@/pages/CreditAnalysisList";
import CreditAnalysisForm from "@/pages/CreditAnalysisForm";
import CommitteeQueue from "@/pages/CommitteeQueue";
import CommitteeVoting from "@/pages/CommitteeVoting";
import ClientHistory from "@/pages/ClientHistory";
import ConsultaCPFCNPJ from "@/pages/ConsultaCPFCNPJ";
import Blacklist from "@/pages/Blacklist";
import Settings from "@/pages/Settings";
import Prospects from "@/pages/Prospects";
import InvoiceMonitoring from "@/pages/InvoiceMonitoring";
import BankruptcyReport from "@/pages/BankruptcyReport";
import Integrations from "@/pages/Integrations";
import CreditEngineSettings from "@/pages/CreditEngineSettings";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/cedentes" element={<Clients />} />
            <Route path="/cedentes/novo" element={<ClientForm />} />
            <Route path="/cedentes/:id" element={<ClientForm />} />
            <Route path="/cedentes/:id/historico" element={<ClientHistory />} />
            <Route path="/analises" element={<CreditAnalysisList />} />
            <Route path="/analises/nova" element={<CreditAnalysisForm />} />
            <Route path="/analises/:id" element={<CreditAnalysisForm />} />
            <Route path="/comite" element={<CommitteeQueue />} />
            <Route path="/comite/:id" element={<CommitteeVoting />} />
            <Route path="/consulta" element={<ConsultaCPFCNPJ />} />
            <Route path="/prospects" element={<Prospects />} />
            <Route path="/monitoramento-nfs" element={<InvoiceMonitoring />} />
            <Route path="/falimentar" element={<BankruptcyReport />} />
            <Route path="/blacklist" element={<Blacklist />} />
            
            <Route path="/configuracoes" element={<Settings />} />
            <Route path="/configuracoes/motor" element={<CreditEngineSettings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
