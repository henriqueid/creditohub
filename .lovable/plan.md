

## Mega Menu Horizontal

Substituir o sidebar por uma barra de navegacao horizontal no topo com mega menu dropdown ao passar o mouse nos grupos.

### Layout

```text
+--[ AT Logo ]--[ Painel Inicial ]--[ Consulta ]--[ Esteira de Credito v ]--[ Monitoramento v ]--[ ⚙ ]--------+
|                                                                                                               |
|  (ao hover em "Esteira de Credito", abre painel dropdown:)                                                   |
|  +-------------------------------------------+                                                                |
|  | 👤 Prospects    | 🏢 Cedentes             |                                                                |
|  | 📄 Analises     | 👥 Comite de Credito     |                                                                |
|  +-------------------------------------------+                                                                |
|                                                                                                               |
|                            CONTEUDO DA PAGINA (100% largura)                                                  |
|                                                                                                               |
+---------------------------------------------------------------------------------------------------------------+
```

### Vantagens

- Conteudo ocupa 100% da largura (sem sidebar roubando espaco)
- Visual de portal financeiro profissional (Bloomberg, Reuters)
- Dropdowns com icone + titulo + descricao curta de cada pagina
- Navegacao mais rapida -- tudo visivel sem precisar expandir/colapsar

### Implementacao

1. **Criar `src/components/AppNavbar.tsx`** -- componente novo
   - Barra fixa no topo com fundo escuro (sidebar colors)
   - Logo "AT" + nome "Ambiente Teste" a esquerda
   - Links diretos: Painel Inicial, Consulta
   - Mega menu triggers: "Esteira de Credito", "Monitoramento" (abrem dropdown ao hover)
   - Icone de engrenagem para Configuracoes a direita
   - Cada dropdown mostra grid 2x2 com icone, titulo e descricao curta
   - Item ativo destacado visualmente

2. **Reescrever `src/components/AppLayout.tsx`**
   - Remover SidebarProvider e AppSidebar
   - Layout vertical: navbar no topo + conteudo abaixo (flex-col)
   - Sem header separado (navbar ja serve como header)

3. **Responsivo (mobile)**
   - Em telas < 768px, navbar colapsa em hamburger menu
   - Abre Sheet lateral com todos os itens agrupados

4. **`AppSidebar.tsx`** -- manter arquivo mas sem uso (pode remover depois)

### Arquivos

| Arquivo | Acao |
|---|---|
| `src/components/AppNavbar.tsx` | Criar |
| `src/components/AppLayout.tsx` | Reescrever |
| `src/components/AppSidebar.tsx` | Deixar de importar |

