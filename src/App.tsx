import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import PageLoader from "@/components/PageLoader";

// HOT paths — eager import for instant navigation (no Suspense flash)
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
import Profile from "@/pages/Profile";
import CRMPipeline from "@/pages/CRMPipeline";
import CRMContacts from "@/pages/CRMContacts";
import CRMActivities from "@/pages/CRMActivities";
import CRMTasks from "@/pages/CRMTasks";
import CRMDashboard from "@/pages/CRMDashboard";
import CRMClientProfile from "@/pages/CRMClientProfile";

// COLD paths — lazy (raros, OK ter um pequeno delay)
const Auth = lazy(() => import("@/pages/Auth"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const InvoiceMonitoring = lazy(() => import("@/pages/InvoiceMonitoring"));
const BankruptcyReport = lazy(() => import("@/pages/BankruptcyReport"));
const CreditEngineSettings = lazy(() => import("@/pages/CreditEngineSettings"));
const PipelineMetrics = lazy(() => import("@/pages/PipelineMetrics"));
const PipelinePerformance = lazy(() => import("@/pages/PipelinePerformance"));
const AuditLog = lazy(() => import("@/pages/AuditLog"));
const Integrations = lazy(() => import("@/pages/Integrations"));
const PatrimonialReport = lazy(() => import("@/pages/PatrimonialReport"));
const BureauSettings = lazy(() => import("@/pages/BureauSettings"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
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
                <Route path="/perfil" element={<Profile />} />
                <Route path="/configuracoes" element={<Settings />} />
                <Route path="/configuracoes/motor" element={<CreditEngineSettings />} />
                <Route path="/configuracoes/bureaus" element={<BureauSettings />} />
                <Route path="/performance" element={<PipelineMetrics />} />
                <Route path="/monitoramento/performance" element={<PipelinePerformance />} />
                <Route path="/audit-log" element={<AuditLog />} />
                <Route path="/integracoes" element={<Integrations />} />
                <Route path="/patrimonial" element={<PatrimonialReport />} />
                {/* CRM */}
                <Route path="/crm/pipeline" element={<CRMPipeline />} />
                <Route path="/crm/contatos" element={<CRMContacts />} />
                <Route path="/crm/atividades" element={<CRMActivities />} />
                <Route path="/crm/tarefas" element={<CRMTasks />} />
                <Route path="/crm/dashboard" element={<CRMDashboard />} />
                <Route path="/crm/cliente/:id" element={<CRMClientProfile />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
