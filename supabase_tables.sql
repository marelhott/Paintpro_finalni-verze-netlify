
-- ========================================
-- SUPABASE SQL SKRIPTY PRO PAINTPRO
-- ========================================
-- Zkopírujte tyto skripty do SQL Exploreru v Supabase

-- 1. TABULKA PRO UŽIVATELE
-- ========================================
CREATE TABLE public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar TEXT,
    color TEXT DEFAULT '#6366f1',
    pin_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABULKA PRO ZAKÁZKY
-- ========================================
CREATE TABLE public.orders (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    datum TEXT NOT NULL,
    druh TEXT NOT NULL,
    klient TEXT,
    cislo TEXT NOT NULL,
    castka DECIMAL(10,2) DEFAULT 0,
    fee DECIMAL(10,2) DEFAULT 0,
    material DECIMAL(10,2) DEFAULT 0,
    pomocnik DECIMAL(10,2) DEFAULT 0,
    palivo DECIMAL(10,2) DEFAULT 0,
    adresa TEXT,
    typ TEXT DEFAULT 'byt',
    doba_realizace INTEGER DEFAULT 1,
    poznamka TEXT,
    soubory JSONB DEFAULT '[]',
    zisk DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABULKA PRO KALENDÁŘOVÉ UDÁLOSTI
-- ========================================
CREATE TABLE public.calendar_events (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    start_time TIME,
    end_time TIME,
    description TEXT,
    color TEXT DEFAULT '#6366f1',
    is_all_day BOOLEAN DEFAULT false,
    event_type TEXT DEFAULT 'general', -- 'general', 'order', 'reminder'
    order_id BIGINT REFERENCES public.orders(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABULKA PRO SOUBORY (volitelná - pro budoucí rozšíření)
-- ========================================
CREATE TABLE public.files (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    order_id BIGINT REFERENCES public.orders(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT,
    file_url TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- INDEXY PRO OPTIMALIZACI VÝKONU
-- ========================================

-- Index pro rychlé vyhledávání zakázek podle uživatele
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_orders_datum ON public.orders(datum);

-- Index pro kalendářové události
CREATE INDEX idx_calendar_events_user_id ON public.calendar_events(user_id);
CREATE INDEX idx_calendar_events_date ON public.calendar_events(start_date);

-- Index pro soubory
CREATE INDEX idx_files_order_id ON public.files(order_id);
CREATE INDEX idx_files_user_id ON public.files(user_id);

-- ========================================
-- RLS (Row Level Security) PRAVIDLA
-- ========================================

-- Povolit RLS na všech tabulkách
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Pravidla pro uživatele (každý vidí pouze sebe)
CREATE POLICY "Users can view own data" ON public.users
    FOR ALL USING (true); -- Pro jednoduchost zatím povolíme vše

-- Pravidla pro zakázky (každý vidí pouze své)
CREATE POLICY "Users can manage own orders" ON public.orders
    FOR ALL USING (true); -- Pro jednoduchost zatím povolíme vše

-- Pravidla pro kalendářové události
CREATE POLICY "Users can manage own calendar events" ON public.calendar_events
    FOR ALL USING (true); -- Pro jednoduchost zatím povolíme vše

-- Pravidla pro soubory
CREATE POLICY "Users can manage own files" ON public.files
    FOR ALL USING (true); -- Pro jednoduchost zatím povolíme vše

-- ========================================
-- TRIGGER PRO AUTOMATICKÉ UPDATED_AT
-- ========================================

-- Funkce pro aktualizaci updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pro uživatele
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger pro zakázky
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON public.orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger pro kalendářové události
CREATE TRIGGER update_calendar_events_updated_at 
    BEFORE UPDATE ON public.calendar_events 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- TESTOVACÍ DATA (volitelné)
-- ========================================

-- Vložit testovacího uživatele (odpovídá současnému localStorage uživateli)
INSERT INTO public.users (id, name, avatar, color, pin_hash) 
VALUES ('user_1', 'Dušan', 'DU', '#6366f1', '12345') -- Nahraďte správným hashem
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- KONEC SKRIPTŮ
-- ========================================
