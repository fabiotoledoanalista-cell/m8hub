-- Ajusta o default da cor da empresa para acompanhar a nova paleta da
-- marca (roxo). Antes ficava com o verde antigo (#22C55E) sempre que a
-- empresa era criada sem escolher uma cor propria em Identidade.
ALTER TABLE public.company
  ALTER COLUMN primary_color SET DEFAULT '#67308E';
