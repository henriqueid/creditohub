import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";

// /cedentes/:id agora redireciona pro perfil (edição é inline)
function CedenteProfileRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/cedentes/${id}/perfil?edit=1`} replace />;
}
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ModuleGuard } from "@/components/ModuleGuard";
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
import CedenteProfile from "@/pages/CedenteProfile";
import ConsultaCPFCNPJ from "@/pages/ConsultaCPFCNPJ";
import Blacklist from "@/pages/Blacklist";
import Settings from "@/pages/Settings";
import Prospects from "@/pages/Prospects";
import ProspectDetail from "@/pages/ProspectDetail";
import Profile from "@/pages/Profile";
import CRMPipeline from "@/pages/CRMPipeline";
import CRMContacts from "@/pages/CRMContacts";
import CRMActivities from "@/pages/CRMActivities";
import CRMTasks from "@/pages/CRMTasks";
import CRMDashboard from "@/pages/CRMDashboard";
import CRMClientProfile from "@/pages/CRMClientProfile";
import DealDetail from "@/pages/DealDetail";

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
const SuperAdmin = lazy(() => import("@/pages/SuperAdmin"));

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
                <Route path="/" element={<ModuleGuard module="dashboard"><Dashboard /></ModuleGuard>} />
                <Route path="/cedentes" element={<ModuleGuard module="cedentes"><Clients /></ModuleGuard>} />
                <Route path="/cedentes/novo" element={<ModuleGuard module="cedentes"><ClientForm /></ModuleGuard>} />
                <Route path="/cedentes/:id" element={<ModuleGuard module="cedentes"><CedenteProfileRedirect /></ModuleGuard>} />
                <Route path="/cedentes/:id/historico" element={<ModuleGuard module="cedentes"><ClientHistory /></ModuleGuard>} />
                <Route path="/cedentes/:id/perfil" element={<ModuleGuard module="cedentes"><CedenteProfile /></ModuleGuard>} />
                <Route path="/analises" element={<ModuleGuard module="credito"><CreditAnalysisList /></ModuleGuard>} />
                <Route path="/analises/nova" element={<ModuleGuard module="credito"><CreditAnalysisForm /></ModuleGuard>} />
                <Route path="/analises/:id" element={<ModuleGuard module="credito"><CreditAnalysisForm /></ModuleGuard>} />
                <Route path="/comite" element={<ModuleGuard module="credito"><CommitteeQueue /></ModuleGuard>} />
                <Route path="/comite/:id" element={<ModuleGuard module="credito"><CommitteeVoting /></ModuleGuard>} />
                <Route path="/consulta" element={<ModuleGuard module="consulta"><ConsultaCPFCNPJ /></ModuleGuard>} />
                <Route path="/prospects" element={<ModuleGuard module="prospects"><Prospects /></ModuleGuard>} />
                <Route path="/prospects/:id" element={<ModuleGuard module="prospects"><ProspectDetail /></ModuleGuard>} />
                <Route path="/monitoramento-nfs" element={<ModuleGuard module="credito"><InvoiceMonitoring /></ModuleGuard>} />
                <Route path="/falimentar" element={<ModuleGuard module="relatorios"><BankruptcyReport /></ModuleGuard>} />
                <Route path="/blacklist" element={<ModuleGuard module="blacklist"><Blacklist /></ModuleGuard>} />
                <Route path="/perfil" element={<Profile />} />
                <Route path="/configuracoes" element={<ModuleGuard module="settings_geral"><Settings /></ModuleGuard>} />
                <Route path="/configuracoes/motor" element={<ModuleGuard module="credito"><CreditEngineSettings /></ModuleGuard>} />
                <Route path="/configuracoes/bureaus" element={<ModuleGuard module="credito"><BureauSettings /></ModuleGuard>} />
                <Route path="/performance" element={<ModuleGuard module="relatorios"><PipelineMetrics /></ModuleGuard>} />
                <Route path="/monitoramento/performance" element={<ModuleGuard module="relatorios"><PipelinePerformance /></ModuleGuard>} />
                <Route path="/audit-log" element={<ModuleGuard module="audit_log"><AuditLog /></ModuleGuard>} />
                <Route path="/integracoes" element={<ModuleGuard module="settings_geral"><Integrations /></ModuleGuard>} />
                <Route path="/patrimonial" element={<ModuleGuard module="relatorios"><PatrimonialReport /></ModuleGuard>} />
                {/* CRM */}
                <Route path="/crm/pipeline" element={<ModuleGuard module="crm"><CRMPipeline /></ModuleGuard>} />
                <Route path="/crm/contatos" element={<ModuleGuard module="crm"><CRMContacts /></ModuleGuard>} />
                <Route path="/crm/atividades" element={<ModuleGuard module="crm"><CRMActivities /></ModuleGuard>} />
                <Route path="/crm/tarefas" element={<ModuleGuard module="crm"><CRMTasks /></ModuleGuard>} />
                <Route path="/crm/dashboard" element={<ModuleGuard module="crm"><CRMDashboard /></ModuleGuard>} />
                <Route path="/crm/cliente/:id" element={<ModuleGuard module="cedentes"><CRMClientProfile /></ModuleGuard>} />
                <Route path="/crm/deal/:id" element={<ModuleGuard module="crm"><DealDetail /></ModuleGuard>} />
                {/* Super-admin */}
                <Route path="/super-admin" element={<SuperAdmin />} />
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
