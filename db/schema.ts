import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const cocktails = sqliteTable("cocktails", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  englishName: text("english_name").notNull().default(""),
  bar: text("bar").notNull().default("HOME/BAR 原创"),
  city: text("city").notNull().default("深圳"),
  category: text("category").notNull().default("homebar"),
  rank: integer("rank"),
  sourceUrl: text("source_url"),
  story: text("story").notNull().default("由深夜客厅的朋友上传。"),
  ingredients: text("ingredients").notNull(),
  recipe: text("recipe").notNull(),
  taste: text("taste").notNull().default("待探索"),
  strength: text("strength").notNull().default("中等"),
  minutes: integer("minutes").notNull().default(4),
  imageKey: text("image_key"),
  price: integer("price").notNull().default(58),
  createdAt: integer("created_at").notNull(),
});

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  customerId: text("customer_id"),
  tableName: text("table_name").notNull(),
  items: text("items").notNull(),
  total: integer("total").notNull(),
  status: text("status").notNull().default("new"),
  createdAt: integer("created_at").notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  providerId: text("provider_id").notNull().unique(),
  nickname: text("nickname").notNull().default("VHB 朋友"),
  avatarUrl: text("avatar_url"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
