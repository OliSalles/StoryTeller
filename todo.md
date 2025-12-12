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
