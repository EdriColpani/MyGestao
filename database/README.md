# Banco de Dados - MyGestao Financeiro

## Objetivo
Este pacote entrega a base SQL para um sistema financeiro multiusuario com isolamento total de dados por `user_id`.

## Garantia de isolamento entre usuarios
1. **Modelagem por ownership**: todas as tabelas de negocio possuem `user_id`.
2. **Validacao de ownership**: trigger impede referencias cruzadas entre usuarios (ex.: cartao de outro usuario).
3. **RLS (Row Level Security)**: politicas por tabela garantem leitura/escrita apenas do usuario logado.
4. **Contexto de sessao obrigatorio**: API deve executar `SET app.user_id = '<uuid>'` em cada request autenticada.
5. **Operacoes sensiveis transacionais**: pagamento de fatura ocorre com funcao atomica.

> Importante: a seguranca depende de a API sempre setar `app.user_id` antes de qualquer query.

## Ordem de execucao
1. `database/scripts/001_extensions.sql`
2. `database/scripts/002_schema.sql`
3. `database/scripts/003_indexes.sql`
4. `database/scripts/004_business_rules.sql`
5. `database/scripts/005_rls.sql`
6. `database/scripts/006_reports_views.sql`
7. `database/scripts/007_seed_categories.sql` (opcional, por usuario)

## Regra de parcelamento
- Ao inserir em `expense_purchases`, trigger cria automaticamente N parcelas em `expense_installments`.
- O valor total e distribuido proporcionalmente entre os meses.
- Ajuste de arredondamento e aplicado na ultima parcela.

## Regra de pagamento mensal
- Use a funcao `fn_process_invoice_payment(...)`.
- Ela valida parcelas pendentes do usuario/cartao/mes.
- Marca como pagas, registra pagamento e cria entrada em `cash_flows`.

## Recomendacoes para backend
- Cada request autenticada:
  - abrir transacao;
  - executar `SET LOCAL app.user_id = '<uuid>'`;
  - executar queries;
  - commit.
- Nunca usar conexao com superuser na API.
- Preferir role de aplicacao sem bypass de RLS.
