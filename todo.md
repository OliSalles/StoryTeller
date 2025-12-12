# Feature AI Platform - TODO

## Autenticação e Estrutura Base
- [x] Sistema de autenticação completo com Manus OAuth
- [x] Dashboard principal com navegação sidebar
- [x] Design Glassmorphism Premium aplicado globalmente

## Banco de Dados
- [x] Tabela de configurações de LLM (modelo, API key, parâmetros)
- [x] Tabela de configurações de Jira (URL, token, projeto padrão)
- [x] Tabela de features geradas
- [x] Tabela de histórias de usuário
- [x] Tabela de critérios de aceite

## Configurações
- [x] Página de configuração de LLM com formulário completo
- [x] Página de configuração de integração Jira
- [x] Validação e teste de conexões

## Geração de Features
- [x] Interface para descrição de features com textarea
- [x] Integração com LLM para processar descrição
- [x] Gerador que cria estrutura completa com histórias e critérios
- [x] Visualização estruturada dos resultados gerados

## Histórico e Exportação
- [x] Página de histórico de features geradas
- [x] Funcionalidade de visualizar detalhes
- [ ] Funcionalidade de editar features existentes
- [x] Exportação para Jira via API
- [x] Feedback visual de sucesso/erro na exportação

## Testes
- [x] Testes unitários para routers tRPC
- [x] Validação de integração com Jira
- [ ] Testes de geração de features com IA

## Melhorias Solicitadas
- [x] Ajustar visualização para mostrar features com histórias agrupadas logo abaixo
- [x] Adicionar seleção de idioma (inglês/português) na geração de features
- [x] Atualizar prompt da IA para gerar conteúdo no idioma selecionado

## Integração Azure DevOps
- [x] Criar tabela de configuração do Azure DevOps no banco de dados
- [x] Adicionar campos específicos do Azure DevOps (state, area, iteration, board, column, swimlane)
- [x] Implementar router de configuração do Azure DevOps
- [x] Criar página de configuração do Azure DevOps
- [x] Implementar exportação de features para Azure DevOps
- [x] Adicionar seleção entre Jira e Azure DevOps na interface

## Processamento Avançado e Edição
- [x] Implementar detecção de prompts grandes (> 2000 caracteres)
- [x] Criar lógica de divisão de prompts em etapas menores
- [x] Implementar processamento sequencial de etapas
- [x] Criar sistema de reunião e consolidação de resultados parciais
- [x] Adicionar interface de edição de features (título, descrição)
- [x] Adicionar interface de edição de histórias de usuário
- [x] Implementar refinamento com novos prompts de IA sobre feature existente
- [ ] Adicionar histórico de versões/refinamentos

## Tasks Técnicas
- [x] Criar tabela de tasks no banco de dados
- [x] Atualizar prompt da IA para gerar tasks para cada história
- [x] Adicionar visualização de tasks na interface de detalhes
- [x] Adicionar json_schema para forçar IA a retornar tasks no processamento em chunks
- [ ] Exportar tasks para Jira como subtasks
- [ ] Exportar tasks para Azure DevOps como tasks vinculadas

## Simplificação de Configuração
- [x] Remover página de configuração de LLM
- [x] Remover rotas e referências de LLM config
- [x] Usar sempre LLM da Manus por padrão
- [x] Atualizar navegação removendo Config. LLM

## Bugs
- [x] Corrigir erro "verifique as configurações de LLM" ao gerar features
- [x] Remover todas as verificações de LLM config dos routers
- [x] Debugar e corrigir erro persistente na geração de features
- [x] Adicionar logs detalhados para identificar problema

- [x] Corrigir erro 500 "Cannot read properties of undefined (reading '0')" ao gerar features
- [x] Adicionar tratamento de erro para respostas vazias da IA

- [x] Corrigir erro de parse JSON quando IA retorna resposta com bloco markdown (```json ... ```)
- [x] Adicionar função de limpeza de markdown antes do JSON.parse

- [ ] Corrigir bug de retorno de 0 histórias na geração de features
- [ ] Verificar se IA está retornando histórias no JSON
- [ ] Verificar se parse está extraindo histórias corretamente

## Aba de Execuções e Logs
- [x] Criar tabela de execuções no banco de dados (execution_logs)
- [x] Adicionar campos: id, userId, featureId, status, startTime, endTime, promptLength, chunksCount, totalStories, aiResponse, errorMessage
- [x] Registrar início de cada geração de feature
- [x] Registrar resposta completa da IA em cada chunk
- [x] Registrar tempo de processamento e status final
- [x] Criar página "Execuções" no menu de navegação
- [x] Exibir lista de execuções com status (sucesso/erro)
- [x] Permitir visualizar logs detalhados de cada execução
- [ ] Adicionar filtros por status e data

- [x] Investigar processamento lento/travado em prompts longos com 4 chunks (6613 caracteres)
- [x] Otimizar processamento de chunks: mudar de sequencial para paralelo com Promise.all
- [x] Adicionar timeout nas chamadas da IA para evitar travamento

## Cancelamento de Execuções
- [x] Limpar execuções travadas em "Processando" no banco de dados
- [x] Implementar AbortController no backend para cancelar requisições da IA
- [x] Criar endpoint tRPC para abortar execução em andamento
- [x] Adicionar botão "Cancelar" no frontend durante processamento
- [x] Atualizar status da execução para "error" ao abortar
- [x] Testar cancelamento com prompt longo

## Bug: Processamento de Chunks
- [ ] Investigar erro "Failed to generate user stories from chunks"
- [ ] Verificar se chunks estão sendo processados corretamente em paralelo
- [ ] Validar se consolidação está recebendo histórias dos chunks
- [ ] Corrigir lógica de merge de histórias de múltiplos chunks
- [ ] Testar com prompt longo que estava falhando
- [x] Adicionar logs detalhados com timestamps em cada etapa do processamento
- [x] Incluir conteúdo parcial das respostas da IA nos logs
- [x] Logar erros específicos de parsing JSON

## Limite de Caracteres
- [x] Adicionar maxLength de 2000 caracteres no textarea
- [x] Adicionar contador visual de caracteres (ex: "1523/2000")
- [x] Testar que não é possível digitar mais de 2000 caracteres

## Renomear App para "Bardo"
- [x] Atualizar VITE_APP_TITLE para "Bardo" (não editável, atualizado no código)
- [x] Atualizar referências no código frontend
- [x] Atualizar package.json name para "bardo"
- [x] Atualizar título da página HTML para "Bardo"
- [x] Testar que o novo nome aparece em todos os lugares

## Logotipo Temático "Bardo"
- [x] Gerar logotipo com tema medieval (contador de histórias/cantor)
- [x] Salvar logo no projeto (client/public/bardo-logo.png)
- [x] Atualizar referências ao logo no código (Home.tsx, DashboardLayout.tsx)
- [x] Criar favicon a partir do logo (favicon.png)
- [x] Testar logo em todas as páginas

## Melhorias de Branding e UX
- [x] Atualizar subtítulo da homepage com tema de bardo
- [x] Adicionar animação sutil ao logo na homepage (Framer Motion)
- [x] Criar versão simplificada do logo (apenas ícone) para loading states

## Atualizar Créditos
- [x] Encontrar todas as referências a "Desenvolvido por Manus" (não havia nenhuma)
- [x] Adicionar footer com "Desenvolvido por Lucas Salles" na homepage
- [x] Remover símbolos/logos da Manus (não havia nenhum)
- [x] Testar em todas as páginas

## Atualizar Página de Login OAuth
- [x] Página de login mostra "Feature AI Platform" ao invés de "Bardo" - REQUER AÇÃO MANUAL
- [x] Página de login mostra "Desenvolvido por Manus" no rodapé - NÃO PODE SER ALTERADO (sistema OAuth)
- [x] Investigar variáveis de ambiente VITE_APP_TITLE - é built-in, não editável via código
- [x] Solução: Usuário deve alterar manualmente em Settings → General → Website name

## Modificar Histórico de Features
- [x] Remover opção de edição do histórico (não havia)
- [x] Adicionar endpoint tRPC para excluir feature
- [x] Adicionar botão "Excluir" no histórico
- [x] Testar exclusão de features com vitest

## Exportação para PDF
- [x] Criar endpoint tRPC para gerar PDF da feature
- [x] Implementar geração de PDF com formatação profissional (título, descrição, histórias, tasks, critérios)
- [x] Adicionar botão "PDF" no histórico de features
- [x] Instalar pdfkit e tipos
- [x] Testar botão de exportação no frontend
