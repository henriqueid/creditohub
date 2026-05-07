import { Navigate, useParams } from "react-router-dom";

/**
 * DEPRECATED: rota /crm/cliente/:id foi substituída por /cedentes/:id/perfil.
 * Mantida apenas como redirect pra não quebrar links antigos.
 */
export default function CRMClientProfile() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <Navigate to="/cedentes" replace />;
  return <Navigate to={`/cedentes/${id}/perfil`} replace />;
}
