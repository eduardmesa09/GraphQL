-- ════════════════════════════════════════════════════════════
--  AFIRMATIVE PILL — 002: Tabla de staging para el CSV
--
--  Todas las columnas son TEXT a proposito: el importador de CSV de
--  Supabase no pelea con tipos y el casting se hace explicito en el
--  seed (003), donde si falla se ve exactamente que fila lo rompio.
--
--  Los nombres coinciden EXACTAMENTE con la cabecera del CSV para que
--  el mapeo automatico del importador funcione sin tocar nada.
--
--  Esta tabla es temporal: se elimina al final del seed.
-- ════════════════════════════════════════════════════════════

create table staging_medications (
  id                    text,
  sku                   text,
  name                  text,
  active_ingredient     text,
  category              text,
  dosage                text,
  presentation          text,
  price                 text,
  stock                 text,
  requires_prescription text,
  manufacturer          text,
  description           text
);
