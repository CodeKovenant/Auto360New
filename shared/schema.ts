import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["admin", "owner"]);
export const businessStatusEnum = pgEnum("business_status", ["pending", "approved", "rejected"]);
export const partConditionEnum = pgEnum("part_condition", ["new", "used"]);

export const businessCategoryEnum = pgEnum("business_category", [
  "car_dealer",
  "garage",
  "spare_parts",
  "car_wash",
  "insurance",
  "other",
]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull().default("owner"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const businesses = pgTable("businesses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  category: businessCategoryEnum("category").notNull(),
  description: text("description").notNull(),
  phone: text("phone").notNull(),
  whatsapp: text("whatsapp").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  logo: text("logo"),
  status: businessStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const spareParts = pgTable("spare_parts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  partName: text("part_name").notNull(),
  carBrand: text("car_brand").notNull(),
  carModel: text("car_model").notNull(),
  year: text("year"),
  condition: partConditionEnum("condition").notNull(),
  price: text("price"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  name: text("name").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertBusinessSchema = createInsertSchema(businesses).omit({ id: true, createdAt: true, status: true });
export const insertSparePartSchema = createInsertSchema(spareParts).omit({ id: true, createdAt: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true, isRead: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type SparePart = typeof spareParts.$inferSelect;
export type InsertSparePart = z.infer<typeof insertSparePartSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export const BUSINESS_CATEGORIES = [
  { value: "car_dealer", label: "Car Dealer" },
  { value: "garage", label: "Professional Garage" },
  { value: "spare_parts", label: "Spare Parts Dealer" },
  { value: "car_wash", label: "Car Wash" },
  { value: "insurance", label: "Insurance" },
  { value: "other", label: "Other Automotive Services" },
] as const;

export type BusinessCategory = typeof BUSINESS_CATEGORIES[number]["value"];
