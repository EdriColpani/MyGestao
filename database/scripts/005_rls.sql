-- Fase 1 - seguranca multiusuario com RLS
-- A aplicacao deve executar: SET app.user_id = '<uuid-do-usuario-logado>';

CREATE OR REPLACE FUNCTION app_current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.user_id', true), '')::uuid;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_invoice_payment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cards_user_isolation ON cards;
CREATE POLICY cards_user_isolation ON cards
    USING (user_id = app_current_user_id())
    WITH CHECK (user_id = app_current_user_id());

DROP POLICY IF EXISTS categories_user_isolation ON categories;
CREATE POLICY categories_user_isolation ON categories
    USING (user_id = app_current_user_id())
    WITH CHECK (user_id = app_current_user_id());

DROP POLICY IF EXISTS monthly_incomes_user_isolation ON monthly_incomes;
CREATE POLICY monthly_incomes_user_isolation ON monthly_incomes
    USING (user_id = app_current_user_id())
    WITH CHECK (user_id = app_current_user_id());

DROP POLICY IF EXISTS expense_purchases_user_isolation ON expense_purchases;
CREATE POLICY expense_purchases_user_isolation ON expense_purchases
    USING (user_id = app_current_user_id())
    WITH CHECK (user_id = app_current_user_id());

DROP POLICY IF EXISTS expense_installments_user_isolation ON expense_installments;
CREATE POLICY expense_installments_user_isolation ON expense_installments
    USING (user_id = app_current_user_id())
    WITH CHECK (user_id = app_current_user_id());

DROP POLICY IF EXISTS card_invoice_payments_user_isolation ON card_invoice_payments;
CREATE POLICY card_invoice_payments_user_isolation ON card_invoice_payments
    USING (user_id = app_current_user_id())
    WITH CHECK (user_id = app_current_user_id());

DROP POLICY IF EXISTS cash_flows_user_isolation ON cash_flows;
CREATE POLICY cash_flows_user_isolation ON cash_flows
    USING (user_id = app_current_user_id())
    WITH CHECK (user_id = app_current_user_id());

-- Payment items sao protegidos via join com payment do mesmo usuario
DROP POLICY IF EXISTS card_invoice_payment_items_user_isolation ON card_invoice_payment_items;
CREATE POLICY card_invoice_payment_items_user_isolation ON card_invoice_payment_items
    USING (
        EXISTS (
            SELECT 1
              FROM card_invoice_payments cip
             WHERE cip.id = payment_id
               AND cip.user_id = app_current_user_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
              FROM card_invoice_payments cip
             WHERE cip.id = payment_id
               AND cip.user_id = app_current_user_id()
        )
    );
