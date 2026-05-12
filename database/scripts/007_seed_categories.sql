-- Fase 1 - seed minimo de categorias por usuario
-- Execute substituindo <USER_ID>

INSERT INTO categories (user_id, name, type)
VALUES
    ('<USER_ID>', 'Salario', 'income'),
    ('<USER_ID>', 'Freelance', 'income'),
    ('<USER_ID>', 'Mercado', 'expense'),
    ('<USER_ID>', 'Transporte', 'expense'),
    ('<USER_ID>', 'Lazer', 'expense'),
    ('<USER_ID>', 'Saude', 'expense'),
    ('<USER_ID>', 'Educacao', 'expense')
ON CONFLICT (user_id, name, type) DO NOTHING;
