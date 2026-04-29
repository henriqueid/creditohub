-- Trigger: ao mudar status de análise para approved/approved_restricted, gerar crm_tasks
CREATE OR REPLACE FUNCTION public.auto_create_task_on_credit_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_name text;
BEGIN
  -- Apenas em mudança de status
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT razao_social INTO v_client_name FROM public.clients WHERE id = NEW.client_id;

    IF NEW.status IN ('approved', 'approved_restricted') THEN
      -- Tarefa de follow-up comercial em 7 dias
      INSERT INTO public.crm_tasks (
        tenant_id, client_id, title, description, due_date, priority, status, assigned_to
      ) VALUES (
        NEW.tenant_id,
        NEW.client_id,
        'Follow-up comercial pós-aprovação — ' || COALESCE(v_client_name, 'cliente'),
        CASE WHEN NEW.status = 'approved'
             THEN 'Crédito aprovado. Avançar oportunidade no funil e contatar o cliente para formalizar a operação.'
             ELSE 'Crédito aprovado COM RESTRIÇÃO. Validar condições especiais antes de operar.'
        END,
        now() + interval '7 days',
        CASE WHEN NEW.status = 'approved_restricted' THEN 'high' ELSE 'medium' END,
        'pending',
        NEW.responsavel_comercial
      );

      -- Restrição: tarefa adicional de revisão em 30d
      IF NEW.status = 'approved_restricted' THEN
        INSERT INTO public.crm_tasks (
          tenant_id, client_id, title, description, due_date, priority, status, assigned_to
        ) VALUES (
          NEW.tenant_id,
          NEW.client_id,
          'Revisar restrição de crédito — ' || COALESCE(v_client_name, 'cliente'),
          'Análise aprovada com restrição há 30 dias. Reavaliar condições, comportamento e indicadores.',
          now() + interval '30 days',
          'high',
          'pending',
          NEW.analista_credito
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_task_on_credit_decision ON public.credit_analysis;
CREATE TRIGGER trg_auto_task_on_credit_decision
AFTER UPDATE ON public.credit_analysis
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_task_on_credit_decision();