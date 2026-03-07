import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, pgEnum, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["admin", "owner"]);
export const businessStatusEnum = pgEnum("business_status", ["pending", "approved", "rejected"]);
export const partConditionEnum = pgEnum("part_condition", ["new", "used"]);
export const fuelTypeEnum = pgEnum("fuel_type", ["petrol", "diesel", "hybrid", "electric", "other"]);
export const transmissionEnum = pgEnum("transmission", ["automatic", "manual"]);

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
  latitude: numeric("latitude"),
  longitude: numeric("longitude"),
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
  image: text("image"),
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

export const cars = pgTable("cars", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealerId: varchar("dealer_id").notNull().references(() => businesses.id),
  title: text("title").notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  price: numeric("price", { precision: 15, scale: 2 }).notNull(),
  mileage: integer("mileage"),
  fuelType: fuelTypeEnum("fuel_type").notNull().default("petrol"),
  transmission: transmissionEnum("transmission").notNull().default("automatic"),
  description: text("description"),
  images: text("images").array(),
  location: text("location").notNull(),
  featured: boolean("featured").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const garageServices = pgTable("garage_services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  garageId: varchar("garage_id").notNull().references(() => businesses.id),
  name: text("name").notNull(),
  description: text("description"),
  price: text("price"),
  popular: boolean("popular").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const supportServices = pgTable("support_services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  name: text("name").notNull(),
  description: text("description"),
  startingPrice: text("starting_price"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reportReasonEnum = pgEnum("report_reason", [
  "fake_listing",
  "scam",
  "misleading_info",
  "other",
]);

export const businessReports = pgTable("business_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  reason: reportReasonEnum("reason").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertBusinessSchema = createInsertSchema(businesses).omit({ id: true, createdAt: true, status: true });
export const insertSparePartSchema = createInsertSchema(spareParts).omit({ id: true, createdAt: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true, isRead: true });
export const insertCarSchema = createInsertSchema(cars).omit({ id: true, createdAt: true });
export const insertGarageServiceSchema = createInsertSchema(garageServices).omit({ id: true, createdAt: true });
export const insertSupportServiceSchema = createInsertSchema(supportServices).omit({ id: true, createdAt: true });
export const insertBusinessReportSchema = createInsertSchema(businessReports).omit({ id: true, createdAt: true });

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
export type Car = typeof cars.$inferSelect;
export type InsertCar = z.infer<typeof insertCarSchema>;
export type GarageService = typeof garageServices.$inferSelect;
export type InsertGarageService = z.infer<typeof insertGarageServiceSchema>;
export type SupportService = typeof supportServices.$inferSelect;
export type InsertSupportService = z.infer<typeof insertSupportServiceSchema>;
export type BusinessReport = typeof businessReports.$inferSelect;
export type InsertBusinessReport = z.infer<typeof insertBusinessReportSchema>;

export const REPORT_REASONS = [
  { value: "fake_listing", label: "Fake Listing" },
  { value: "scam", label: "Scam / Fraud" },
  { value: "misleading_info", label: "Misleading Information" },
  { value: "other", label: "Other" },
] as const;

export const BUSINESS_CATEGORIES = [
  { value: "car_dealer", label: "Automobile Dealers" },
  { value: "spare_parts", label: "Auto Spare Part Dealers" },
  { value: "garage", label: "Auto Garage" },
  { value: "automotive_support", label: "Automotive Support" },
  { value: "car_wash", label: "Car Wash" },
  { value: "insurance", label: "Insurance" },
  { value: "other", label: "Other Automotive Services" },
] as const;

export const FUEL_TYPES = [
  { value: "petrol", label: "Petrol" },
  { value: "diesel", label: "Diesel" },
  { value: "hybrid", label: "Hybrid" },
  { value: "electric", label: "Electric" },
  { value: "other", label: "Other" },
] as const;

export const TRANSMISSIONS = [
  { value: "automatic", label: "Automatic" },
  { value: "manual", label: "Manual" },
] as const;

export type BusinessCategory = typeof BUSINESS_CATEGORIES[number]["value"];
