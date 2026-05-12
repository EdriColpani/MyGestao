-- Fase 1 - indices de desempenho

CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

CREATE INDEX IF NOT EXISTS idx_monthly_incomes_user_month
    ON monthly_incomes(user_id, reference_month);

CREATE INDEX IF NOT EXISTS idx_expense_purchases_user_month
    ON expense_purchases(user_id, reference_month);

CREATE INDEX IF NOT EXISTS idx_expense_installments_user_month_status
    ON expense_installments(user_id, reference_month, status);

CREATE INDEX IF NOT EXISTS idx_expense_installments_card_month_status
    ON expense_installments(card_id, reference_month, status);

CREATE INDEX IF NOT EXISTS idx_card_invoice_payments_user_month
    ON card_invoice_payments(user_id, reference_month);

CREATE INDEX IF NOT EXISTS idx_cash_flows_user_month_type
    ON cash_flows(user_id, reference_month, movement_type);
