-- Fase 1 - views auxiliares de relatorios

CREATE OR REPLACE VIEW vw_expense_status AS
SELECT
    ei.user_id,
    ei.id AS installment_id,
    ei.reference_month,
    ei.amount,
    ei.status,
    ep.expense_description,
    ep.store_name,
    c.name AS card_name,
    c.brand AS card_brand
FROM expense_installments ei
JOIN expense_purchases ep ON ep.id = ei.purchase_id
JOIN cards c ON c.id = ei.card_id;

CREATE OR REPLACE VIEW vw_monthly_balance AS
SELECT
    u.id AS user_id,
    m.reference_month,
    COALESCE(m.total_income, 0) AS total_income,
    COALESCE(e.total_expense, 0) AS total_expense,
    COALESCE(m.total_income, 0) - COALESCE(e.total_expense, 0) AS balance
FROM users u
LEFT JOIN (
    SELECT user_id, reference_month, SUM(amount) AS total_income
    FROM monthly_incomes
    GROUP BY user_id, reference_month
) m ON m.user_id = u.id
LEFT JOIN (
    SELECT user_id, reference_month, SUM(amount) AS total_expense
    FROM cash_flows
    WHERE movement_type = 'expense'
    GROUP BY user_id, reference_month
) e ON e.user_id = u.id AND e.reference_month = m.reference_month;
