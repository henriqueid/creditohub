import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import PageLoader from "@/components/PageLoader";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Clients = lazy(() => import("@/pages/Clients"));
const ClientForm = lazy(() => import("@/pages/ClientForm"));
const CreditAnalysisList = lazy(() => import("@/pages/CreditAnalysisList"));
const CreditAnalysisForm = lazy(() => import("@/pages/CreditAnalysisForm"));
const CommitteeQueue = lazy(() => import("@/pages/CommitteeQueue"));
const CommitteeVoting = lazy(() => import("@/pages/CommitteeVoting"));
const ClientHistory = lazy(() => import("@/pages/ClientHistory"));
const ConsultaCPFCNPJ = lazy(() => import("@/pages/ConsultaCPFCNPJ"));
const Blacklist = lazy(() => import("@/pages/Blacklist"));
const Settings = lazy(() => import("@/pages/Settings"));
const Prospects = lazy(() => import("@/pages/Prospects"));
const InvoiceMonitoring = lazy(() => import("@/pages/InvoiceMonitoring"));
const BankruptcyReport = lazy(() => import("@/pages/BankruptcyReport"));
const CreditEngineSettings = lazy(() => import("@/pages/CreditEngineSettings"));
const PipelineMetrics = lazy(() => import("@/pages/PipelineMetrics"));
const AuditLog = lazy(() => import("@/pages/AuditLog"));
const Auth = lazy(() => import("@/pages/Auth"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const CRMPipeline = lazy(() => import("@/pages/CRMPipeline"));
const CRMContacts = lazy(() => import("@/pages/CRMContacts"));
const CRMActivities = lazy(() => import("@/pages/CRMActivities"));
const CRMTasks = lazy(() => import("@/pages/CRMTasks"));
const CRMDashboard = lazy(() => import("@/pages/CRMDashboard"));
const CRMClientProfile = lazy(() => import("@/pages/CRMClientProfile"));
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
                <Route path="/configuracoes" element={<Settings />} />
                <Route path="/configuracoes/motor" element={<CreditEngineSettings />} />
                <Route path="/configuracoes/bureaus" element={<BureauSettings />} />
                <Route path="/performance" element={<PipelineMetrics />} />
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
