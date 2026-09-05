-- 第1步：定制需求报告落库字段（若 pnpm db:push 未执行，可手动跑）
ALTER TABLE analyze_records ADD COLUMN IF NOT EXISTS report jsonb;
