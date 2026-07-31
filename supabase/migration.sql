-- ═══ The Tower Clone — Supabase 数据库初始化 ═══
-- 在 Supabase SQL Editor 中粘贴执行

-- 玩家资料表（关联 Supabase Auth）
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  username TEXT NOT NULL UNIQUE,
  best_wave INT DEFAULT 0,
  total_waves INT DEFAULT 0,
  total_kills INT DEFAULT 0,
  kills_by_type JSONB DEFAULT '{"basic":0,"fast":0,"ranged":0,"tank":0,"boss":0}',
  total_coins INT DEFAULT 0,
  games_played INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- 每日任务
CREATE TABLE missions (
  date TEXT PRIMARY KEY,
  missions_data JSONB NOT NULL
);

-- RLS 策略
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

-- 排行榜：任何人可读
CREATE POLICY "public_read" ON players FOR SELECT USING (true);
CREATE POLICY "public_read" ON missions FOR SELECT USING (true);

-- 玩家只能更新自己的记录
CREATE POLICY "owner_update" ON players
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 玩家只能插入自己的记录
CREATE POLICY "owner_insert" ON players
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 任务：可读写
CREATE POLICY "service_write" ON missions FOR ALL USING (true);

-- ═══ 新用户自动创建玩家记录 ═══
-- Trigger runs with SECURITY DEFINER, bypasses RLS
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.players (user_id, username)
  VALUES (NEW.id, coalesce(
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'user_name',
    NEW.raw_user_meta_data->>'full_name',
    'Player'
  ));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
