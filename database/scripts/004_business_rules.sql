-- Fase 1 - regras de negocio no banco

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_set_updated_at') THEN
        CREATE TRIGGER trg_users_set_updated_at BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_cards_set_updated_at') THEN
        CREATE TRIGGER trg_cards_set_updated_at BEFORE UPDATE ON cards
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_categories_set_updated_at') THEN
        CREATE TRIGGER trg_categories_set_updated_at BEFORE UPDATE ON categories
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_monthly_incomes_set_updated_at') THEN
        CREATE TRIGGER trg_monthly_incomes_set_updated_at BEFORE UPDATE ON monthly_incomes
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_expense_purchases_set_updated_at') THEN
        CREATE TRIGGER trg_expense_purchases_set_updated_at BEFORE UPDATE ON expense_purchases
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_expense_installments_set_updated_at') THEN
        CREATE TRIGGER trg_expense_installments_set_updated_at BEFORE UPDATE ON expense_installments
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_card_invoice_payments_set_updated_at') THEN
        CREATE TRIGGER trg_card_invoice_payments_set_updated_at BEFORE UPDATE ON card_invoice_payments
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_cash_flows_set_updated_at') THEN
        CREATE TRIGGER trg_cash_flows_set_updated_at BEFORE UPDATE ON cash_flows
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
    END IF;
END $$;

CREATE OR REPLACE FUNCTION fn_validate_cross_user_references()
RETURNS TRIGGER AS $$
DECLARE
    v_card_user UUID;
    v_category_user UUID;
BEGIN
    SELECT user_id INTO v_card_user FROM cards WHERE id = NEW.card_id;
    SELECT user_id INTO v_category_user FROM categories WHERE id = NEW.category_id;

    IF v_card_user IS NULL OR v_category_user IS NULL THEN
        RAISE EXCEPTION 'Card or category not found';
    END IF;

    IF v_card_user <> NEW.user_id OR v_category_user <> NEW.user_id THEN
        RAISE EXCEPTION 'Cross-user references are not allowed';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_expense_purchases_validate_ownership') THEN
        CREATE TRIGGER trg_expense_purchases_validate_ownership
        BEFORE INSERT OR UPDATE ON expense_purchases
        FOR EACH ROW EXECUTE FUNCTION fn_validate_cross_user_references();
    END IF;
END $$;

CREATE OR REPLACE FUNCTION fn_generate_installments_after_purchase()
RETURNS TRIGGER AS $$
DECLARE
    i INTEGER;
    base_amount NUMERIC(14,2);
    remainder NUMERIC(14,2);
    current_amount NUMERIC(14,2);
BEGIN
    base_amount := TRUNC((NEW.total_amount / NEW.installments)::numeric, 2);
    remainder := NEW.total_amount - (base_amount * NEW.installments);

    FOR i IN 1..NEW.installments LOOP
        current_amount := base_amount;
        IF i = NEW.installments THEN
            current_amount := base_amount + remainder;
        END IF;

        INSERT INTO expense_installments (
            purchase_id,
            user_id,
            card_id,
            installment_number,
            total_installments,
            reference_month,
            amount,
            status
        ) VALUES (
            NEW.id,
            NEW.user_id,
            NEW.card_id,
            i,
            NEW.installments,
            (DATE_TRUNC('month', NEW.reference_month)::date + ((i - 1) || ' month')::interval)::date,
            current_amount,
            'pending'
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_expense_purchases_generate_installments') THEN
        CREATE TRIGGER trg_expense_purchases_generate_installments
        AFTER INSERT ON expense_purchases
        FOR EACH ROW EXECUTE FUNCTION fn_generate_installments_after_purchase();
    END IF;
END $$;

CREATE OR REPLACE FUNCTION fn_process_invoice_payment(
    p_user_id UUID,
    p_card_id UUID,
    p_reference_month DATE,
    p_payment_date DATE,
    p_installment_ids UUID[]
)
RETURNS UUID AS $$
DECLARE
    v_payment_id UUID;
    v_total NUMERIC(14,2);
BEGIN
    IF p_installment_ids IS NULL OR array_length(p_installment_ids, 1) IS NULL THEN
        RAISE EXCEPTION 'No installments selected';
    END IF;

    SELECT COALESCE(SUM(amount), 0)
      INTO v_total
      FROM expense_installments ei
     WHERE ei.id = ANY(p_installment_ids)
       AND ei.user_id = p_user_id
       AND ei.card_id = p_card_id
       AND ei.reference_month = DATE_TRUNC('month', p_reference_month)::date
       AND ei.status = 'pending';

    IF v_total <= 0 THEN
        RAISE EXCEPTION 'No pending installments available for payment';
    END IF;

    INSERT INTO card_invoice_payments (
        user_id,
        card_id,
        reference_month,
        paid_total_amount,
        payment_date
    ) VALUES (
        p_user_id,
        p_card_id,
        DATE_TRUNC('month', p_reference_month)::date,
        v_total,
        p_payment_date
    ) RETURNING id INTO v_payment_id;

    INSERT INTO card_invoice_payment_items (payment_id, expense_installment_id, amount)
    SELECT v_payment_id, ei.id, ei.amount
      FROM expense_installments ei
     WHERE ei.id = ANY(p_installment_ids)
       AND ei.user_id = p_user_id
       AND ei.card_id = p_card_id
       AND ei.reference_month = DATE_TRUNC('month', p_reference_month)::date
       AND ei.status = 'pending';

    UPDATE expense_installments
       SET status = 'paid',
           paid_at = NOW(),
           updated_at = NOW()
     WHERE id = ANY(p_installment_ids)
       AND user_id = p_user_id
       AND card_id = p_card_id
       AND reference_month = DATE_TRUNC('month', p_reference_month)::date
       AND status = 'pending';

    INSERT INTO cash_flows (
        user_id,
        movement_type,
        origin_type,
        origin_id,
        reference_month,
        movement_date,
        amount,
        description
    ) VALUES (
        p_user_id,
        'expense',
        'invoice_payment',
        v_payment_id,
        DATE_TRUNC('month', p_reference_month)::date,
        p_payment_date,
        v_total,
        'Pagamento de fatura do cartao'
    );

    RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql;
