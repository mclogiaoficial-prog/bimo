# BIMO — Seu Agente de Negócios

Projeto inicial de uma plataforma de gestão adaptável a diferentes profissões.

## O que está incluído
- Interface responsiva para celular e computador.
- Login/cadastro preparado para Supabase Auth.
- Modo demonstração local para testar sem conta.
- Perfil profissional.
- Clientes, agenda, serviços/produtos, ordens de serviço.
- Financeiro com entradas, despesas, pendências e alerta de atraso superior a 30 dias.
- Relatórios básicos.
- Estrutura PWA instalável.
- SQL inicial com Row Level Security.
- Esqueleto de função para integração Hotmart (não ativa até implementar validação).

## Publicar a interface no GitHub Pages
1. Crie um repositório GitHub chamado `bimo` (ou outro nome).
2. Envie todos os arquivos e pastas desta pasta para a raiz do repositório.
3. Abra Settings > Pages.
4. Em Build and deployment, escolha Deploy from a branch.
5. Selecione `main` e `/ (root)` e salve.
6. Aguarde o GitHub gerar a URL.

## Configurar Supabase
1. Crie um projeto no Supabase.
2. Abra SQL Editor e execute `supabase/migrations/001_initial_schema.sql`.
3. Em Project Settings > API, copie Project URL e anon/public key.
4. Abra `config.js` e preencha `SUPABASE_URL` e `SUPABASE_ANON_KEY`.
5. No Supabase, configure Authentication > URL Configuration com a URL do GitHub Pages.
6. Teste cadastro, confirmação de e-mail, login e criação de registros.

A chave `anon/public` é feita para uso no navegador quando RLS está corretamente configurado.
NUNCA coloque `service_role`, senha do banco ou segredo Hotmart no `config.js`.

## O que ainda NÃO está pronto para produção
- Webhook Hotmart: o arquivo é somente um esqueleto seguro que não ativa assinaturas. É necessário implementar autenticação do webhook, validação do evento/produto/comprador, idempotência e atualização da assinatura no banco.
- Bloqueio real por assinatura: deve ser implementado no servidor e reforçado por políticas/RPC, não apenas escondendo telas no navegador.
- Emissão fiscal: requer integração com provedor fiscal autorizado e dados fiscais de cada profissional. O sistema não emite nota fiscal nesta versão.
- IA para entender qualquer profissão: a personalização atual usa regras simples de palavras-chave; integração real com IA exige serviço de servidor e orçamento/limites.
- Lembretes por WhatsApp/e-mail: dependem de provedor e consentimento do usuário.
- Segurança, privacidade, LGPD, backups, testes e monitoramento precisam ser revisados antes de vender.

## Recomendação de desenvolvimento
Primeiro publicar e testar o MVP com dados fictícios. Depois configurar Supabase e autenticação. Só então integrar Hotmart e ativar cobrança. Não anuncie como sistema fiscal ou IA completa antes dessas integrações.
