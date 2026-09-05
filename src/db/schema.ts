import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  account: varchar('account', { length: 64 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  nickname: varchar('nickname', { length: 64 }).notNull(),
  avatar: text('avatar'),
  isAdmin: boolean('is_admin').notNull().default(false),
  analyzeCount: integer('analyze_count').notNull().default(2),
  drawCount: integer('draw_count').notNull().default(2),
  status: varchar('status', { length: 16 }).notNull().default('active'), // active | frozen
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 128 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** 登录失败计数与临时锁定（按账号） */
export const loginAttempts = pgTable('login_attempts', {
  account: varchar('account', { length: 64 }).primaryKey(),
  failCount: integer('fail_count').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const globalConfig = pgTable('global_config', {
  id: integer('id').primaryKey().default(1),
  defaultAnalyzeCount: integer('default_analyze_count').notNull().default(2),
  defaultDrawCount: integer('default_draw_count').notNull().default(2),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const analyzeRecords = pgTable('analyze_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  imageUrl: text('image_url').notNull().default(''),
  costumeStructure: jsonb('costume_structure').$type<string[]>().notNull(),
  fabricGuess: jsonb('fabric_guess').$type<string[]>().notNull(),
  colorScheme: jsonb('color_scheme')
    .$type<{ name: string; hex: string }[]>()
    .notNull(),
  accessories: jsonb('accessories').$type<string[]>().notNull(),
  materials: jsonb('materials').$type<string[]>().notNull(),
  craftDifficulties: jsonb('craft_difficulties').$type<string[]>().notNull(),
  patternTips: jsonb('pattern_tips').$type<string[]>().notNull(),
  /** 完整定制需求报告（新）；旧数据可为空 */
  report: jsonb('report').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const drawRecords = pgTable('draw_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  imageUrl: text('image_url').notNull().default(''),
  prompt: text('prompt').notNull(),
  style: varchar('style', { length: 64 }).notNull(),
  mode: varchar('mode', { length: 16 }).notNull(), // text2img | img2img
  refImageUrl: text('ref_image_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type UserRow = typeof users.$inferSelect;
export type AnalyzeRecordRow = typeof analyzeRecords.$inferSelect;
export type DrawRecordRow = typeof drawRecords.$inferSelect;
