import 'dotenv/config';
import { db, pool } from '../src/db';
import {
  analyzeRecords,
  drawRecords,
  globalConfig,
  sessions,
  users,
} from '../src/db/schema';
import { hashPassword } from '../src/lib/auth';
import { buildDrawImageSvg } from '../src/lib/ai';

async function ensureTables() {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      account varchar(64) NOT NULL UNIQUE,
      password_hash text NOT NULL,
      nickname varchar(64) NOT NULL,
      avatar text,
      is_admin boolean NOT NULL DEFAULT false,
      analyze_count integer NOT NULL DEFAULT 2,
      draw_count integer NOT NULL DEFAULT 2,
      status varchar(16) NOT NULL DEFAULT 'active',
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token varchar(128) NOT NULL UNIQUE,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS global_config (
      id integer PRIMARY KEY DEFAULT 1,
      default_analyze_count integer NOT NULL DEFAULT 2,
      default_draw_count integer NOT NULL DEFAULT 2,
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS analyze_records (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      image_url text NOT NULL DEFAULT '',
      costume_structure jsonb NOT NULL,
      fabric_guess jsonb NOT NULL,
      color_scheme jsonb NOT NULL,
      accessories jsonb NOT NULL,
      materials jsonb NOT NULL,
      craft_difficulties jsonb NOT NULL,
      pattern_tips jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS draw_records (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      image_url text NOT NULL DEFAULT '',
      prompt text NOT NULL,
      style varchar(64) NOT NULL,
      mode varchar(16) NOT NULL,
      ref_image_url text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

const SEED_USERS = [
  { account: 'admin', nickname: '管理员大人', password: 'admin123', isAdmin: true, analyzeCount: 99, drawCount: 99, status: 'active' },
  { account: 'hoshino', nickname: '星野纱织', password: '123456', isAdmin: false, analyzeCount: 5, drawCount: 5, status: 'active' },
  { account: 'tsukiyo', nickname: '月光琉璃', password: '123456', isAdmin: false, analyzeCount: 8, drawCount: 6, status: 'active' },
  { account: 'momiji', nickname: '枫红小町', password: '123456', isAdmin: false, analyzeCount: 0, drawCount: 1, status: 'active' },
  { account: 'yukishiro', nickname: '雪落千寒', password: '123456', isAdmin: false, analyzeCount: 10, drawCount: 8, status: 'frozen' },
  { account: 'sakuraba', nickname: '樱庭时雨', password: '123456', isAdmin: false, analyzeCount: 3, drawCount: 4, status: 'active' },
] as const;

async function main() {
  console.log('Ensuring tables...');
  await ensureTables();

  console.log('Resetting business tables...');
  await db.delete(sessions);
  await db.delete(analyzeRecords);
  await db.delete(drawRecords);
  await db.delete(users);
  await db.delete(globalConfig);

  await db.insert(globalConfig).values({
    id: 1,
    defaultAnalyzeCount: 2,
    defaultDrawCount: 2,
  });

  console.log('Seeding users...');
  const inserted = [];
  for (const u of SEED_USERS) {
    const [row] = await db
      .insert(users)
      .values({
        account: u.account,
        nickname: u.nickname,
        passwordHash: hashPassword(u.password),
        isAdmin: u.isAdmin,
        analyzeCount: u.analyzeCount,
        drawCount: u.drawCount,
        status: u.status,
      })
      .returning();
    inserted.push(row);
  }

  const hoshino = inserted.find((u) => u.account === 'hoshino')!;

  console.log('Seeding analyze/draw history for hoshino...');
  await db.insert(analyzeRecords).values({
    userId: hoshino.id,
    imageUrl: '',
    costumeStructure: [
      '上衣：立领交叉短款和服式外套，七分袖',
      '内搭：白色收腰修身衬裙，蕾丝领口',
      '下装：百褶及膝短裙，高腰设计',
      '配饰：蝴蝶结腰封 + 及膝长袜 + 玛丽珍鞋',
    ],
    fabricGuess: [
      '外套：暗纹提花绸缎（光泽感强，适合垂坠）',
      '衬裙：雪纺 + 蕾丝拼接',
      '裙子：制服呢或厚雪纺（挺括保形）',
    ],
    colorScheme: [
      { name: '酒红外套', hex: '#8B1A3B' },
      { name: '米白衬裙', hex: '#FFF5E6' },
      { name: '墨绿腰封', hex: '#2D5A3D' },
      { name: '金色镶边', hex: '#D4AF37' },
    ],
    accessories: ['头顶大蝴蝶结发饰 × 1', '蕾丝手套（短款）× 2', '颈圈式丝带 choker × 1'],
    materials: ['金属按扣 × 6', '隐形拉链 × 2', '裙衬硬网纱 × 0.5m'],
    craftDifficulties: ['立领交叉结构需加衬保形', '百褶裙褶子均匀度要求高'],
    patternTips: ['上衣后中开拉链', '裙长建议膝盖上2-3cm', '腰封宽度建议8-10cm'],
  });

  const seedDraws = [
    { prompt: '哥特萝莉风洋装，黑色蕾丝，十字装饰，暗黑系', style: '赛璐璐', mode: 'text2img' as const },
    { prompt: '国风汉服少女，齐胸襦裙，飘带，仙气', style: '厚涂', mode: 'text2img' as const },
    { prompt: '蒸汽朋克风格服装，齿轮，皮革，护目镜', style: '水彩', mode: 'img2img' as const },
    { prompt: '魔法少女战斗服，星星元素，发光效果', style: '赛璐璐', mode: 'img2img' as const },
  ];

  for (const item of seedDraws) {
    await db.insert(drawRecords).values({
      userId: hoshino.id,
      prompt: item.prompt,
      style: item.style,
      mode: item.mode,
      imageUrl: buildDrawImageSvg(item.prompt, item.style, item.mode),
    });
  }

  console.log('Seed OK');
  console.log('Test accounts:');
  for (const u of SEED_USERS) {
    console.log(`  ${u.account} / ${u.password}${u.isAdmin ? ' (admin)' : ''}`);
  }
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
