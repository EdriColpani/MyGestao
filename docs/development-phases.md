# Fases de Desenvolvimento

## Fase 1 - Base de dados e seguranca (iniciada e concluida)
- [x] Schema relacional principal
- [x] Chaves primarias e estrangeiras
- [x] Indices de performance
- [x] Regras de negocio no banco (parcelamento e pagamento)
- [x] RLS com isolamento por usuario
- [x] Views de relatorio base

## Fase 2 - Backend (API + autenticacao)
- [x] Cadastro/login com JWT (access + refresh)
- [x] Middleware para `SET LOCAL app.user_id`
- [x] CRUD de cartoes, categorias e receitas
- [x] Cadastro de despesas com parcelas automaticas
- [x] Endpoint de pagamento de fatura mensal
- [x] Endpoints de dashboard e relatorios

## Fase 3 - Frontend (interface moderna azul/verde)
- [x] Tela de login e cadastro
- [x] Dashboard com graficos (receitas x despesas, por cartao, por categoria)
- [x] Cadastro de receitas mensais
- [x] Cadastro de despesas (todos campos obrigatorios)
- [x] Pagamento mensal (mes + cartao + carga automatica)
- [x] Relatorios com filtros e indicadores

## Fase 4 - Qualidade e publicacao
- [x] Testes unitarios e integracao (backend) — Vitest: health, 401, isolamento A/B
- [x] Testes de isolamento multiusuario — `tests/auth-isolation.test.ts`
- [x] Testes e2e das jornadas criticas — Playwright smoke (login/cadastro, viewport mobile Pixel 5)
- [x] Pipeline CI/CD para dev/test/prod — GitHub Actions (`.github/workflows/ci.yml`)
- [x] Hardening de seguranca — Helmet, rate limit em `/auth/login|register|refresh`, `trustProxy`

## Fase 5 - UX mobile e acessibilidade (em andamento)
- [x] Menu lateral em gaveta no celular, header fixo, areas segares (notch)
- [x] Viewport meta (`device-width`, `viewport-fit=cover`, `theme-color`)
- [x] Formularios com alvos de toque maiores e textos quebra-linha em erros longos
- [x] Graficos e tabelas com alturas e scroll adequados em telas pequenas
