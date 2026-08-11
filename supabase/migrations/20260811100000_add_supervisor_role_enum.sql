-- Garante que o enum tenant_role tenha o valor 'supervisor' (Gestor)
ALTER TYPE tenant_role ADD VALUE IF NOT EXISTS 'supervisor';
