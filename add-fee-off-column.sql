
-- SQL příkaz pro přidání sloupce fee_off do tabulky orders
-- Spusťte tento příkaz v SQL Editor v Supabase Dashboard

ALTER TABLE public.orders 
ADD COLUMN fee_off DECIMAL(10,2) DEFAULT 0;

-- Aktualizace existujících záznamů - vypočítá fee_off jako castka - fee
UPDATE public.orders 
SET fee_off = COALESCE(castka, 0) - COALESCE(fee, 0);

-- Ověření že sloupec byl přidán
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'fee_off';
