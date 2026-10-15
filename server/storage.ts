import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, ilike, and, or, sql, gte, lte, asc, desc, inArray, isNull } from "drizzle-orm";
import {
  users, businesses, spareParts, reviews, messages, cars, garageServices, supportServices, businessReports, galleryImages, featureRequests,
  type User, type InsertUser,
  type Business, type InsertBusiness,
  type SparePart, type InsertSparePart,
  type Review, type InsertReview,
  type Message, type InsertMessage,
  type Car, type InsertCar,
  type GarageService, type InsertGarageService,
  type SupportService, type InsertSupportService,
  type BusinessReport, type InsertBusinessReport,
  type GalleryImage, type InsertGalleryImage,
} from "@shared/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false, });
export const db = drizzle(pool);

let persistentUploadsTableReady: Promise<void> | null = null;

export async function ensurePersistentUploadsTable(): Promise<void> {
  if (!persistentUploadsTableReady) {
    persistentUploadsTableReady = pool.query(
      `CREATE TABLE IF NOT EXISTS persistent_uploads (
        storage_key text PRIMARY KEY,
        content_type text NOT NULL,
        content bytea NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW()
      )`
    ).then(() => undefined).catch((error) => {
      persistentUploadsTableReady = null;
      throw error;
    });
  }
  await persistentUploadsTableReady;
}

export async function savePersistentUpload(storageKey: string, contentType: string, content: Buffer): Promise<void> {
  await ensurePersistentUploadsTable();
  await pool.query(
    `INSERT INTO persistent_uploads (storage_key, content_type, content)
     VALUES ($1, $2, $3)
     ON CONFLICT (storage_key) DO NOTHING`,
    [storageKey, contentType, content]
  );
}

export async function getPersistentUpload(storageKey: string): Promise<{ contentType: string; data: Buffer } | undefined> {
  await ensurePersistentUploadsTable();
  const result = await pool.query(
    "SELECT content_type, content FROM persistent_uploads WHERE storage_key = $1",
    [storageKey]
  );
  const row = result.rows[0];
  return row ? { contentType: row.content_type, data: row.content } : undefined;
}

export async function hasPersistentUpload(storageKey: string): Promise<boolean> {
  await ensurePersistentUploadsTable();
  const result = await pool.query(
    "SELECT 1 FROM persistent_uploads WHERE storage_key = $1 LIMIT 1",
    [storageKey]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function deletePersistentUpload(storageKey: string): Promise<void> {
  await ensurePersistentUploadsTable();
  await pool.query("DELETE FROM persistent_uploads WHERE storage_key = $1", [storageKey]);
}

function normalizedListingText(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function normalizedListingPrice(value: unknown): string {
  const text = normalizedListingText(value).replace(/,/g, "");
  const amount = Number(text);
  return Number.isFinite(amount) ? amount.toFixed(2) : text;
}

export async function createCarIfNotDuplicate(car: InsertCar): Promise<{ record: Car; duplicate: boolean }> {
  const key = JSON.stringify([
    "car", car.dealerId, normalizedListingText(car.title), normalizedListingText(car.brand),
    normalizedListingText(car.model), car.year, normalizedListingPrice(car.price), car.mileage ?? null,
    normalizedListingText(car.fuelType), normalizedListingText(car.transmission), normalizedListingText(car.condition),
  ]);
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${key})::bigint)`);
    const [existing] = await tx.select().from(cars).where(and(
      eq(cars.dealerId, car.dealerId),
      sql`LOWER(BTRIM(${cars.title})) = ${normalizedListingText(car.title)}`,
      sql`LOWER(BTRIM(${cars.brand})) = ${normalizedListingText(car.brand)}`,
      sql`LOWER(BTRIM(${cars.model})) = ${normalizedListingText(car.model)}`,
      eq(cars.year, car.year),
      sql`${cars.price} = ${car.price}`,
      sql`${cars.mileage} IS NOT DISTINCT FROM ${car.mileage ?? null}`,
      eq(cars.fuelType, car.fuelType ?? "petrol"),
      eq(cars.transmission, car.transmission ?? "automatic"),
      eq(cars.condition, car.condition ?? "used"),
    )).limit(1);
    if (existing) return { record: existing, duplicate: true };
    const [record] = await tx.insert(cars).values(car).returning();
    return { record, duplicate: false };
  });
}

export async function createSparePartIfNotDuplicate(part: InsertSparePart): Promise<{ record: SparePart; duplicate: boolean }> {
  const key = JSON.stringify([
    "part", part.businessId, normalizedListingText(part.partName), normalizedListingText(part.carBrand),
    normalizedListingText(part.carModel), normalizedListingText(part.year), normalizedListingText(part.condition),
    normalizedListingText(part.price),
  ]);
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${key})::bigint)`);
    const [existing] = await tx.select().from(spareParts).where(and(
      eq(spareParts.businessId, part.businessId),
      sql`LOWER(BTRIM(${spareParts.partName})) = ${normalizedListingText(part.partName)}`,
      sql`LOWER(BTRIM(${spareParts.carBrand})) = ${normalizedListingText(part.carBrand)}`,
      sql`LOWER(BTRIM(${spareParts.carModel})) = ${normalizedListingText(part.carModel)}`,
      sql`LOWER(BTRIM(COALESCE(${spareParts.year}, ''))) = ${normalizedListingText(part.year)}`,
      eq(spareParts.condition, part.condition),
      sql`LOWER(BTRIM(COALESCE(${spareParts.price}, ''))) = ${normalizedListingText(part.price)}`,
    )).limit(1);
    if (existing) return { record: existing, duplicate: true };
    const [record] = await tx.insert(spareParts).values(part).returning();
    return { record, duplicate: false };
  });
}


/** Active premium window evaluated in Postgres (avoids JS vs timestamp-without-timezone skew). */
function premiumSubscriptionStillActive() {
  return or(isNull(businesses.premiumExpiresAt), sql`${businesses.premiumExpiresAt} > NOW()`);
}

async function clearPremiumFlagsPastExpiryInDb() {
  await db
    .update(businesses)
    .set({ premium: false })
    .where(
      and(
        sql`${businesses.premium} IS TRUE`,
        sql`${businesses.premiumExpiresAt} IS NOT NULL`,
        sql`${businesses.premiumExpiresAt} <= NOW()`
      )
    );
}

export interface IStorage {
  // Users
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  getAllUsers(): Promise<Pick<User, "id" | "name" | "email" | "role" | "createdAt">[]>;

  // Businesses
  getBusinessById(id: string): Promise<Business | undefined>;
  getBusinessByOwnerId(ownerId: string): Promise<Business | undefined>;
  getAllBusinesses(filters?: { category?: string; subcategory?: string; city?: string; q?: string; minRating?: number }): Promise<(Business & { avgRating: number; reviewCount: number; galleryImage: string | null })[]>;
  getFeaturedBusinesses(): Promise<(Business & { avgRating: number; reviewCount: number; galleryImage: string | null })[]>;
  getPremiumBusinesses(): Promise<(Business & { avgRating: number; reviewCount: number; galleryImage: string | null })[]>;
  getHomepageBusinessSections(limitPerCategory: number): Promise<Record<string, (Business & { avgRating: number; reviewCount: number; galleryImage: string | null })[]>>;
  createBusiness(biz: InsertBusiness & Partial<Pick<Business, "status" | "featured">>): Promise<Business>;
  updateBusiness(id: string, data: Partial<Business>): Promise<Business>;
  deleteBusiness(id: string): Promise<void>;
  getPendingBusinesses(): Promise<Business[]>;
  getApprovedBusinesses(): Promise<Business[]>;
  getRejectedBusinesses(): Promise<Business[]>;

  // Spare Parts
  getSparePartsByBusinessId(businessId: string): Promise<(SparePart & { galleryImage: string | null })[]>;
  getOwnerDashboardSparePartsByBusinessId(businessId: string): Promise<SparePart[]>;
  getSparePartById(id: string): Promise<(SparePart & { businessName: string; businessCity: string; businessAddress: string; businessPhone: string; businessWhatsapp: string; businessLogo: string | null; businessOwnerId: string; galleryImage: string | null }) | undefined>;
  getFeaturedSpareParts(): Promise<(SparePart & { businessName: string; businessCity: string; businessLogo: string | null; galleryImage: string | null })[]>;
  createSparePart(part: InsertSparePart): Promise<SparePart>;
  updateSparePart(id: string, data: Partial<SparePart>): Promise<SparePart>;
  deleteSparePart(id: string): Promise<void>;

  // Reviews
  getReviewsByBusinessId(businessId: string): Promise<Review[]>;
  getAllReviews(): Promise<(Review & { businessName: string })[]>;
  createReview(review: InsertReview): Promise<Review>;
  deleteReview(id: string): Promise<void>;
  getAvgRating(businessId: string): Promise<{ avgRating: number; reviewCount: number }>;

  // Messages
  getMessagesByBusinessId(businessId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Cars
  getCars(filters?: { brand?: string; minPrice?: number; maxPrice?: number; minYear?: number; maxYear?: number; location?: string; q?: string; dealerId?: string; condition?: string; includeSuspended?: boolean }): Promise<(Car & { dealerName: string; dealerWhatsapp: string; dealerLogo: string | null; galleryImage: string | null })[]>;
  getFeaturedCars(): Promise<(Car & { dealerName: string; dealerWhatsapp: string; dealerLogo: string | null; galleryImage: string | null })[]>;
  getCarById(id: string): Promise<(Car & { dealerName: string; dealerWhatsapp: string; dealerLogo: string | null; galleryImage: string | null }) | undefined>;
  getCarsByDealerId(dealerId: string): Promise<Car[]>;
  getOwnerDashboardCarsByDealerId(dealerId: string): Promise<Car[]>;
  createCar(car: InsertCar): Promise<Car>;
  updateCar(id: string, data: Partial<Car>): Promise<Car>;
  deleteCar(id: string): Promise<void>;

  // Garage Services
  getGarageServices(filters?: { q?: string; location?: string; minPrice?: number; maxPrice?: number; garageId?: string; includeSuspended?: boolean }): Promise<(GarageService & { garageName: string; garageWhatsapp: string; garageCity: string; garageLogo: string | null; galleryImage: string | null })[]>;
  getFeaturedGarageServices(): Promise<(GarageService & { garageName: string; garageWhatsapp: string; garageCity: string; garageLogo: string | null; galleryImage: string | null })[]>;
  getPopularGarageServices(): Promise<(GarageService & { garageName: string; garageWhatsapp: string; garageCity: string; garageLogo: string | null; galleryImage: string | null })[]>;
  getGarageServiceById(id: string): Promise<(GarageService & { garageName: string; garageWhatsapp: string; garageCity: string; garageLogo: string | null; galleryImage: string | null }) | undefined>;
  getGarageServicesByGarageId(garageId: string): Promise<GarageService[]>;
  getOwnerDashboardGarageServicesByGarageId(garageId: string): Promise<GarageService[]>;
  createGarageService(service: InsertGarageService): Promise<GarageService>;
  updateGarageService(id: string, data: Partial<GarageService>): Promise<GarageService>;
  deleteGarageService(id: string): Promise<void>;

  // Support Services
  getSupportServicesByBusinessId(businessId: string): Promise<(SupportService & { galleryImage: string | null })[]>;
  getOwnerDashboardSupportServicesByBusinessId(businessId: string): Promise<SupportService[]>;
  getSupportServiceById(id: string): Promise<(SupportService & { businessName: string; businessCity: string; businessLogo: string | null; businessSubcategory: string | null; businessPhone: string; businessWhatsapp: string; businessAddress: string; galleryImage: string | null }) | undefined>;
  getFeaturedSupportServices(): Promise<(SupportService & { businessName: string; businessCity: string; businessLogo: string | null; businessSubcategory: string | null; galleryImage: string | null })[]>;
  createSupportService(service: InsertSupportService): Promise<SupportService>;
  updateSupportService(id: string, data: Partial<SupportService>): Promise<SupportService>;
  deleteSupportService(id: string): Promise<void>;

  // Reports
  createReport(report: InsertBusinessReport): Promise<BusinessReport>;
  getAllReports(): Promise<(BusinessReport & { businessName: string })[]>;

  // Gallery
  getGalleryImages(entityType: string, entityId: string): Promise<GalleryImage[]>;
  addGalleryImage(image: InsertGalleryImage): Promise<GalleryImage>;
  deleteGalleryImage(id: string): Promise<void>;
  getGalleryImageById(id: string): Promise<GalleryImage | undefined>;

  // Brand page
  getBusinessesByBrand(brand: string): Promise<{
    dealers: (Business & { avgRating: number; reviewCount: number; galleryImage: string | null })[];
    spareParts: (Business & { avgRating: number; reviewCount: number; galleryImage: string | null })[];
    garages: (Business & { avgRating: number; reviewCount: number; galleryImage: string | null })[];
  }>;
}

export class DatabaseStorage implements IStorage {
  private async addFirstGalleryImages<T extends { id: string }>(
    items: T[],
    entityType: "business" | "car" | "spare_part" | "garage_service" | "support_service",
  ): Promise<(T & { galleryImage: string | null })[]> {
    if (items.length === 0) return [];
    const images = await db
      .select({ entityId: galleryImages.entityId, url: galleryImages.url })
      .from(galleryImages)
      .where(and(
        eq(galleryImages.entityType, entityType),
        inArray(galleryImages.entityId, items.map(item => item.id)),
      ))
      .orderBy(asc(galleryImages.createdAt));
    const firstImageById = new Map<string, string>();
    for (const image of images) {
      if (!firstImageById.has(image.entityId)) firstImageById.set(image.entityId, image.url);
    }
    return items.map(item => ({ ...item, galleryImage: firstImageById.get(item.id) ?? null }));
  }

  async getUserById(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser) {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: string, data: Partial<User>) {
    const [updated] = await db.update(users).set(data as any).where(eq(users.id, id)).returning();
    return updated;
  }

  async getUserByVerificationToken(token: string) {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
    return user;
  }

  async getAllUsers() {
    return db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    }).from(users).orderBy(users.createdAt);
  }

  async getBusinessById(id: string) {
    const [biz] = await db.select().from(businesses).where(eq(businesses.id, id));
    return biz;
  }

  async getBusinessByOwnerId(ownerId: string) {
    const [biz] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerId, ownerId));
    return biz;
  }

  async getAvgRating(businessId: string) {
    const result = await db
      .select({
        avgRating: sql<number>`coalesce(avg(${reviews.rating}), 0)`,
        reviewCount: sql<number>`count(${reviews.id})`,
      })
      .from(reviews)
      .where(eq(reviews.businessId, businessId));
    return {
      avgRating: Number(result[0]?.avgRating || 0),
      reviewCount: Number(result[0]?.reviewCount || 0),
    };
  }

  async getAllBusinesses(filters?: { category?: string; subcategory?: string; city?: string; q?: string; minRating?: number }) {
    const conditions = [eq(businesses.status, "approved"), eq(businesses.suspended, false)];
    if (filters?.category) {
      if (filters.category === "automotive_support") {
        if (filters.subcategory === "car_wash_detailing") {
          conditions.push(
            or(
              eq(businesses.category, "car_wash"),
              and(
                eq(businesses.category, "other"),
                eq(businesses.subcategory, filters.subcategory)
              )
            )!
          );
        } else if (filters.subcategory) {
          conditions.push(
            and(
              inArray(businesses.category, ["insurance", "car_wash", "other"]),
              eq(businesses.subcategory, filters.subcategory)
            )!
          );
        } else {
          conditions.push(inArray(businesses.category, ["insurance", "car_wash", "other"]));
        }
      } else {
        conditions.push(eq(businesses.category, filters.category as any));
      }
    }
    if (filters?.city) conditions.push(ilike(businesses.city, `%${filters.city}%`));
    if (filters?.q) {
      conditions.push(
        or(
          ilike(businesses.name, `%${filters.q}%`),
          ilike(businesses.city, `%${filters.q}%`),
          ilike(businesses.description, `%${filters.q}%`),
          ilike(businesses.address, `%${filters.q}%`)
        )!
      );
    }
    const bizList = await db.select().from(businesses).where(and(...conditions)).orderBy(desc(businesses.featured), desc(businesses.createdAt));
    const bizWithRatings = await Promise.all(
      bizList.map(async (biz) => {
        const { avgRating, reviewCount } = await this.getAvgRating(biz.id);
        return { ...biz, avgRating, reviewCount };
      })
    );
    const enrichedBusinesses = await this.addFirstGalleryImages(bizWithRatings, "business");
    if (filters?.minRating && filters.minRating > 0) {
      return enrichedBusinesses.filter(b => b.avgRating >= filters.minRating!);
    }
    return enrichedBusinesses;
  }

  async getPremiumBusinesses() {
    await clearPremiumFlagsPastExpiryInDb();
    const bizList = await db
      .select()
      .from(businesses)
      .where(and(eq(businesses.status, "approved"), eq(businesses.suspended, false), sql`${businesses.premium} IS TRUE`, premiumSubscriptionStillActive()))
      .orderBy(businesses.createdAt);
    const ratedBusinesses = await Promise.all(
      bizList.map(async (biz) => {
        const { avgRating, reviewCount } = await this.getAvgRating(biz.id);
        return { ...biz, avgRating, reviewCount };
      })
    );
    return this.addFirstGalleryImages(ratedBusinesses, "business");
  }

  async getFeaturedBusinesses() {
    const bizList = await db
      .select()
      .from(businesses)
      .where(and(eq(businesses.status, "approved"), eq(businesses.suspended, false), eq(businesses.featured, true)))
      .orderBy(desc(businesses.createdAt))
      .limit(6);
    const ratedBusinesses = await Promise.all(
      bizList.map(async (biz) => {
        const { avgRating, reviewCount } = await this.getAvgRating(biz.id);
        return { ...biz, avgRating, reviewCount };
      })
    );
    return this.addFirstGalleryImages(ratedBusinesses, "business");
  }

  async getHomepageBusinessSections(limitPerCategory: number) {
    await clearPremiumFlagsPastExpiryInDb();
    const categories = ["car_dealer", "garage", "spare_parts", "car_wash", "insurance", "other"] as const;
    const cap = Math.max(1, Math.min(limitPerCategory, 24));
    const result: Record<string, (Business & { avgRating: number; reviewCount: number; galleryImage: string | null })[]> = {};

    for (const category of categories) {
      const categoryBusinesses = await db
        .select()
        .from(businesses)
        .where(and(eq(businesses.status, "approved"), eq(businesses.suspended, false), eq(businesses.featured, true), eq(businesses.category, category)))
        .orderBy(
          desc(businesses.featured),
          desc(sql`CASE WHEN ${businesses.premium} IS TRUE THEN 1 ELSE 0 END`),
          desc(businesses.createdAt)
        )
        .limit(cap);
      const ratedBusinesses = await Promise.all(
        categoryBusinesses.map(async (biz) => {
          const { avgRating, reviewCount } = await this.getAvgRating(biz.id);
          return { ...biz, avgRating, reviewCount };
        })
      );
      result[category] = await this.addFirstGalleryImages(ratedBusinesses, "business");
    }

    return result;
  }

  async createBusiness(biz: InsertBusiness & Partial<Pick<Business, "status" | "featured">>) {
    const [created] = await db.insert(businesses).values(biz).returning();
    return created;
  }

  async updateBusiness(id: string, data: Partial<Business>) {
    const [updated] = await db.update(businesses).set(data).where(eq(businesses.id, id)).returning();
    return updated;
  }

  async deleteBusiness(id: string) {
    await db.transaction(async tx => {
      const carIds = await tx.select({ id: cars.id }).from(cars).where(eq(cars.dealerId, id));
      const partIds = await tx.select({ id: spareParts.id }).from(spareParts).where(eq(spareParts.businessId, id));
      const garageServiceIds = await tx.select({ id: garageServices.id }).from(garageServices).where(eq(garageServices.garageId, id));
      const supportServiceIds = await tx.select({ id: supportServices.id }).from(supportServices).where(eq(supportServices.businessId, id));
      const requestIds = [
        { type: "business" as const, id },
        ...carIds.map(item => ({ type: "car" as const, id: item.id })),
        ...partIds.map(item => ({ type: "part" as const, id: item.id })),
        ...garageServiceIds.map(item => ({ type: "garage_service" as const, id: item.id })),
        ...supportServiceIds.map(item => ({ type: "support_service" as const, id: item.id })),
      ];
      for (const request of requestIds) {
        await tx.delete(featureRequests).where(and(
          eq(featureRequests.itemType, request.type),
          eq(featureRequests.itemId, request.id),
        ));
      }
      await tx.delete(galleryImages).where(and(
        inArray(galleryImages.entityType, ["business", "car", "spare_part", "garage_service", "support_service"]),
        inArray(galleryImages.entityId, [
          id,
          ...carIds.map(item => item.id),
          ...partIds.map(item => item.id),
          ...garageServiceIds.map(item => item.id),
          ...supportServiceIds.map(item => item.id),
        ]),
      ));
      await tx.delete(spareParts).where(eq(spareParts.businessId, id));
      await tx.delete(reviews).where(eq(reviews.businessId, id));
      await tx.delete(messages).where(eq(messages.businessId, id));
      await tx.delete(businessReports).where(eq(businessReports.businessId, id));
      await tx.delete(cars).where(eq(cars.dealerId, id));
      await tx.delete(garageServices).where(eq(garageServices.garageId, id));
      await tx.delete(supportServices).where(eq(supportServices.businessId, id));
      await tx.delete(businesses).where(eq(businesses.id, id));
    });
  }

  async getPendingBusinesses() {
    return db.select().from(businesses).where(eq(businesses.status, "pending")).orderBy(businesses.createdAt);
  }

  async getApprovedBusinesses() {
    return db.select().from(businesses).where(eq(businesses.status, "approved")).orderBy(businesses.createdAt);
  }

  async getRejectedBusinesses() {
    return db.select().from(businesses).where(eq(businesses.status, "rejected")).orderBy(businesses.createdAt);
  }

  async getSparePartsByBusinessId(businessId: string, includeSuspended = false) {
    const [business] = await db.select({ id: businesses.id }).from(businesses).where(and(
      eq(businesses.id, businessId),
      eq(businesses.status, "approved"),
      eq(businesses.category, "spare_parts"),
      ...(includeSuspended ? [] : [eq(businesses.suspended, false)]),
    ));
    if (!business) return [];
    const conditions = [eq(spareParts.businessId, businessId)];
    if (!includeSuspended) conditions.push(eq(spareParts.suspended, false));
    const parts = await db.select().from(spareParts).where(and(...conditions)).orderBy(desc(spareParts.featured), desc(spareParts.createdAt));
    return this.addFirstGalleryImages(parts, "spare_part");
  }

  async getOwnerDashboardSparePartsByBusinessId(businessId: string) {
    return db
      .select()
      .from(spareParts)
      .where(eq(spareParts.businessId, businessId))
      .orderBy(desc(spareParts.createdAt));
  }

  async getSparePartById(id: string) {
    const [part] = await db
      .select({
        id: spareParts.id,
        businessId: spareParts.businessId,
        partName: spareParts.partName,
        carBrand: spareParts.carBrand,
        carModel: spareParts.carModel,
        year: spareParts.year,
        condition: spareParts.condition,
        price: spareParts.price,
        description: spareParts.description,
        image: spareParts.image,
        featured: spareParts.featured,
        suspended: spareParts.suspended,
        createdAt: spareParts.createdAt,
        businessName: businesses.name,
        businessCity: businesses.city,
        businessAddress: businesses.address,
        businessPhone: businesses.phone,
        businessWhatsapp: businesses.whatsapp,
        businessLogo: businesses.logo,
        businessOwnerId: businesses.ownerId,
      })
      .from(spareParts)
      .innerJoin(businesses, eq(spareParts.businessId, businesses.id))
      .where(and(eq(spareParts.id, id), eq(spareParts.suspended, false), eq(businesses.status, "approved"), eq(businesses.suspended, false), eq(businesses.category, "spare_parts")));
    if (!part) return undefined;
    const [enriched] = await this.addFirstGalleryImages([part], "spare_part");
    return enriched;
  }

  async getFeaturedSpareParts() {
    const parts = await db
      .select({
        id: spareParts.id,
        businessId: spareParts.businessId,
        partName: spareParts.partName,
        carBrand: spareParts.carBrand,
        carModel: spareParts.carModel,
        year: spareParts.year,
        condition: spareParts.condition,
        price: spareParts.price,
        description: spareParts.description,
        image: spareParts.image,
        featured: spareParts.featured,
        suspended: spareParts.suspended,
        createdAt: spareParts.createdAt,
        businessName: businesses.name,
        businessCity: businesses.city,
        businessLogo: businesses.logo,
      })
      .from(spareParts)
      .innerJoin(businesses, eq(spareParts.businessId, businesses.id))
      .where(and(eq(businesses.status, "approved"), eq(businesses.suspended, false), eq(businesses.category, "spare_parts"), eq(spareParts.suspended, false), eq(spareParts.featured, true)))
      .orderBy(desc(spareParts.createdAt))
      .limit(12);
    return this.addFirstGalleryImages(parts, "spare_part");
  }
  async createSparePart(part: InsertSparePart) {
    const [created] = await db.insert(spareParts).values(part).returning();
    return created;
  }

  async updateSparePart(id: string, data: Partial<SparePart>) {
    const { id: _id, businessId: _bid, createdAt: _ca, ...rest } = data as any;
    const [updated] = await db.update(spareParts).set(rest).where(eq(spareParts.id, id)).returning();
    return updated;
  }

  async deleteSparePart(id: string) {
    await db.delete(spareParts).where(eq(spareParts.id, id));
  }

  async getReviewsByBusinessId(businessId: string) {
    return db.select().from(reviews).where(eq(reviews.businessId, businessId)).orderBy(reviews.createdAt);
  }

  async getAllReviews() {
    const allReviews = await db.select().from(reviews).orderBy(desc(reviews.createdAt));
    const bizIds = Array.from(new Set(allReviews.map(r => r.businessId)));
    if (bizIds.length === 0) return [];
    const bizList = await db.select({ id: businesses.id, name: businesses.name }).from(businesses).where(inArray(businesses.id, bizIds));
    const bizMap = Object.fromEntries(bizList.map(b => [b.id, b.name]));
    return allReviews.map(r => ({ ...r, businessName: bizMap[r.businessId] || "Unknown" }));
  }

  async createReview(review: InsertReview) {
    const [created] = await db.insert(reviews).values(review).returning();
    return created;
  }

  async deleteReview(id: string) {
    await db.delete(reviews).where(eq(reviews.id, id));
  }

  async getMessagesByBusinessId(businessId: string) {
    return db.select().from(messages).where(eq(messages.businessId, businessId)).orderBy(sql`${messages.createdAt} DESC`);
  }

  async createMessage(message: InsertMessage) {
    const [created] = await db.insert(messages).values(message).returning();
    return created;
  }

  // Cars
  private async enrichCar(car: Car): Promise<Car & { dealerName: string; dealerWhatsapp: string; dealerLogo: string | null }> {
    const [dealer] = await db.select({ name: businesses.name, whatsapp: businesses.whatsapp, logo: businesses.logo }).from(businesses).where(eq(businesses.id, car.dealerId));
    return { ...car, dealerName: dealer?.name || "Unknown", dealerWhatsapp: dealer?.whatsapp || "", dealerLogo: dealer?.logo || null };
  }

  async getCars(filters?: { brand?: string; minPrice?: number; maxPrice?: number; minYear?: number; maxYear?: number; location?: string; q?: string; dealerId?: string; condition?: string; includeSuspended?: boolean }) {
    const conditions: any[] = [];
    if (filters?.brand) conditions.push(ilike(cars.brand, `%${filters.brand}%`));
    if (filters?.location) conditions.push(ilike(cars.location, `%${filters.location}%`));
    if (filters?.dealerId) conditions.push(eq(cars.dealerId, filters.dealerId));
    if (filters?.minPrice) conditions.push(gte(cars.price, String(filters.minPrice)));
    if (filters?.maxPrice) conditions.push(lte(cars.price, String(filters.maxPrice)));
    if (filters?.minYear) conditions.push(gte(cars.year, filters.minYear));
    if (filters?.maxYear) conditions.push(lte(cars.year, filters.maxYear));
    if (filters?.condition) conditions.push(eq(cars.condition, filters.condition as any));
    if (!filters?.includeSuspended) conditions.push(eq(cars.suspended, false));
    if (filters?.q) {
      conditions.push(
        or(
          ilike(cars.title, `%${filters.q}%`),
          ilike(cars.brand, `%${filters.q}%`),
          ilike(cars.model, `%${filters.q}%`),
          ilike(cars.location, `%${filters.q}%`)
        )!
      );
    }

    // Only show cars from approved dealers
    const dealerConditions = [eq(businesses.status, "approved"), eq(businesses.category, "car_dealer")];
    if (!filters?.includeSuspended) dealerConditions.push(eq(businesses.suspended, false));
    const approvedDealers = await db.select({ id: businesses.id }).from(businesses).where(and(...dealerConditions));
    const dealerIds = approvedDealers.map(d => d.id);
    if (dealerIds.length === 0) return [];

    const carList = await db.select().from(cars)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(sql`CASE WHEN ${cars.featured} IS TRUE THEN 1 ELSE 0 END`), desc(cars.createdAt));

    const filtered = carList.filter(c => dealerIds.includes(c.dealerId));
    return this.addFirstGalleryImages(await Promise.all(filtered.map(c => this.enrichCar(c))), "car");
  }

  async getFeaturedCars() {
    const approvedDealers = await db.select({ id: businesses.id }).from(businesses).where(and(eq(businesses.status, "approved"), eq(businesses.suspended, false), eq(businesses.category, "car_dealer")));
    const dealerIds = approvedDealers.map(d => d.id);
    if (dealerIds.length === 0) return [];
    const carList = await db.select().from(cars).where(and(eq(cars.featured, true), eq(cars.suspended, false))).orderBy(desc(cars.createdAt)).limit(6);
    const filtered = carList.filter(c => dealerIds.includes(c.dealerId));
    return this.addFirstGalleryImages(await Promise.all(filtered.map(c => this.enrichCar(c))), "car");
  }

  async getCarById(id: string) {
    const [car] = await db.select().from(cars).where(and(eq(cars.id, id), eq(cars.suspended, false)));
    if (!car) return undefined;
    const [dealer] = await db.select({ id: businesses.id }).from(businesses).where(and(eq(businesses.id, car.dealerId), eq(businesses.status, "approved"), eq(businesses.suspended, false)));
    if (!dealer) return undefined;
    const [enriched] = await this.addFirstGalleryImages([await this.enrichCar(car)], "car");
    return enriched;
  }

  async getCarsByDealerId(dealerId: string) {
    return db.select().from(cars)
      .where(and(eq(cars.dealerId, dealerId), eq(cars.suspended, false)))
      .orderBy(desc(sql`CASE WHEN ${cars.featured} IS TRUE THEN 1 ELSE 0 END`), desc(cars.createdAt));
  }

  async getOwnerDashboardCarsByDealerId(dealerId: string) {
    return db
      .select()
      .from(cars)
      .where(eq(cars.dealerId, dealerId))
      .orderBy(desc(cars.createdAt));
  }

  async createCar(car: InsertCar) {
    const [created] = await db.insert(cars).values(car).returning();
    return created;
  }

  async updateCar(id: string, data: Partial<Car>) {
    const [updated] = await db.update(cars).set(data).where(eq(cars.id, id)).returning();
    return updated;
  }

  async deleteCar(id: string) {
    await db.delete(cars).where(eq(cars.id, id));
  }

  // Garage Services
  private async enrichService(svc: GarageService): Promise<GarageService & { garageName: string; garageWhatsapp: string; garageCity: string; garageLogo: string | null }> {
    const [garage] = await db.select({ name: businesses.name, whatsapp: businesses.whatsapp, city: businesses.city, logo: businesses.logo }).from(businesses).where(eq(businesses.id, svc.garageId));
    return { ...svc, garageName: garage?.name || "Unknown", garageWhatsapp: garage?.whatsapp || "", garageCity: garage?.city || "", garageLogo: garage?.logo || null };
  }

  async getGarageServices(filters?: { q?: string; location?: string; garageId?: string; includeSuspended?: boolean }) {
    const conditions: any[] = [];
    if (filters?.garageId) conditions.push(eq(garageServices.garageId, filters.garageId));
    if (filters?.q) {
      conditions.push(or(ilike(garageServices.name, `%${filters.q}%`), ilike(garageServices.description, `%${filters.q}%`))!);
    }

    const garageConditions = [eq(businesses.status, "approved"), eq(businesses.category, "garage")];
    if (!filters?.includeSuspended) garageConditions.push(eq(businesses.suspended, false));
    const approvedGarages = await db.select({ id: businesses.id }).from(businesses).where(and(...garageConditions));
    const garageIds = approvedGarages.map(g => g.id);
    if (garageIds.length === 0) return [];

    if (!filters?.includeSuspended) conditions.push(eq(garageServices.suspended, false));
    const svcList = await db.select().from(garageServices)
      .where(and(...conditions))
      .orderBy(desc(garageServices.featured), desc(garageServices.createdAt));

    const filtered = svcList.filter(s => garageIds.includes(s.garageId));
    const enriched = await Promise.all(filtered.map(s => this.enrichService(s)));
    const locationFiltered = filters?.location
      ? enriched.filter(service => service.garageCity.toLowerCase().includes(filters.location!.toLowerCase()))
      : enriched;
    return this.addFirstGalleryImages(locationFiltered, "garage_service");
  }

  async getPopularGarageServices() {
    const approvedGarages = await db.select({ id: businesses.id }).from(businesses).where(and(eq(businesses.status, "approved"), eq(businesses.suspended, false), eq(businesses.category, "garage")));
    const garageIds = approvedGarages.map(g => g.id);
    if (garageIds.length === 0) return [];

    const svcList = await db.select().from(garageServices).where(and(eq(garageServices.popular, true), eq(garageServices.suspended, false))).orderBy(desc(garageServices.createdAt)).limit(6);
    let filtered = svcList.filter(s => garageIds.includes(s.garageId));
    if (filtered.length < 3) {
      const all = await db.select().from(garageServices).where(eq(garageServices.suspended, false)).orderBy(desc(garageServices.createdAt)).limit(6);
      filtered = all.filter(s => garageIds.includes(s.garageId)).slice(0, 6);
    }
    return this.addFirstGalleryImages(await Promise.all(filtered.map(s => this.enrichService(s))), "garage_service");
  }

  async getFeaturedGarageServices() {
    const approvedGarages = await db.select({ id: businesses.id }).from(businesses).where(and(eq(businesses.status, "approved"), eq(businesses.suspended, false), eq(businesses.category, "garage")));
    const garageIds = approvedGarages.map(g => g.id);
    if (garageIds.length === 0) return [];

    const featuredServices = await db.select().from(garageServices)
      .where(and(inArray(garageServices.garageId, garageIds), eq(garageServices.suspended, false), eq(garageServices.featured, true)))
      .orderBy(desc(garageServices.createdAt))
      .limit(6);
    return this.addFirstGalleryImages(await Promise.all(featuredServices.map(service => this.enrichService(service))), "garage_service");
  }

  async getGarageServiceById(id: string) {
    const [service] = await db.select().from(garageServices).where(and(eq(garageServices.id, id), eq(garageServices.suspended, false)));
    if (!service) return undefined;

    const [garage] = await db
      .select({ id: businesses.id })
      .from(businesses)
      .where(and(
        eq(businesses.id, service.garageId),
        eq(businesses.status, "approved"),
        eq(businesses.suspended, false),
        eq(businesses.category, "garage"),
      ));
    if (!garage) return undefined;

    const [enriched] = await this.addFirstGalleryImages([await this.enrichService(service)], "garage_service");
    return enriched;
  }

  async getGarageServicesByGarageId(garageId: string) {
    return db.select().from(garageServices).where(eq(garageServices.garageId, garageId)).orderBy(desc(garageServices.featured), desc(garageServices.createdAt));
  }

  async getOwnerDashboardGarageServicesByGarageId(garageId: string) {
    return db
      .select()
      .from(garageServices)
      .where(eq(garageServices.garageId, garageId))
      .orderBy(desc(garageServices.createdAt));
  }

  async createGarageService(service: InsertGarageService) {
    const [created] = await db.insert(garageServices).values(service).returning();
    return created;
  }

  async updateGarageService(id: string, data: Partial<GarageService>) {
    const [updated] = await db.update(garageServices).set(data).where(eq(garageServices.id, id)).returning();
    return updated;
  }

  async deleteGarageService(id: string) {
    await db.delete(garageServices).where(eq(garageServices.id, id));
  }

  // Support Services
  async getSupportServicesByBusinessId(businessId: string, includeSuspended = false) {
    const [business] = await db.select({ id: businesses.id }).from(businesses).where(and(
      eq(businesses.id, businessId),
      eq(businesses.status, "approved"),
      inArray(businesses.category, ["insurance", "car_wash", "other"]),
      ...(includeSuspended ? [] : [eq(businesses.suspended, false)]),
    ));
    if (!business) return [];
    const conditions = [eq(supportServices.businessId, businessId)];
    if (!includeSuspended) conditions.push(eq(supportServices.suspended, false));
    const services = await db.select().from(supportServices).where(and(...conditions)).orderBy(desc(supportServices.featured), desc(supportServices.createdAt));
    return this.addFirstGalleryImages(services, "support_service");
  }

  async getOwnerDashboardSupportServicesByBusinessId(businessId: string) {
    return db
      .select()
      .from(supportServices)
      .where(eq(supportServices.businessId, businessId))
      .orderBy(desc(supportServices.createdAt));
  }

  async getSupportServiceById(id: string) {
    const [service] = await db
      .select({
        id: supportServices.id,
        businessId: supportServices.businessId,
        name: supportServices.name,
        description: supportServices.description,
        startingPrice: supportServices.startingPrice,
        featured: supportServices.featured,
        suspended: supportServices.suspended,
        createdAt: supportServices.createdAt,
        businessName: businesses.name,
        businessCity: businesses.city,
        businessLogo: businesses.logo,
        businessSubcategory: businesses.subcategory,
        businessPhone: businesses.phone,
        businessWhatsapp: businesses.whatsapp,
        businessAddress: businesses.address,
      })
      .from(supportServices)
      .innerJoin(businesses, eq(supportServices.businessId, businesses.id))
      .where(and(eq(supportServices.id, id), eq(supportServices.suspended, false), eq(businesses.status, "approved"), eq(businesses.suspended, false)));
    if (!service) return undefined;
    const [enriched] = await this.addFirstGalleryImages([service], "support_service");
    return enriched;
  }

  async getFeaturedSupportServices() {
    const services = await db
      .select({
        id: supportServices.id,
        businessId: supportServices.businessId,
        name: supportServices.name,
        description: supportServices.description,
        startingPrice: supportServices.startingPrice,
        featured: supportServices.featured,
        suspended: supportServices.suspended,
        createdAt: supportServices.createdAt,
        businessName: businesses.name,
        businessCity: businesses.city,
        businessLogo: businesses.logo,
        businessSubcategory: businesses.subcategory,
      })
      .from(supportServices)
      .innerJoin(businesses, eq(supportServices.businessId, businesses.id))
      .where(and(eq(businesses.status, "approved"), eq(businesses.suspended, false), inArray(businesses.category, ["insurance", "car_wash", "other"]), eq(supportServices.suspended, false), eq(supportServices.featured, true)))
      .orderBy(
        desc(sql`CASE WHEN ${businesses.subcategory} = 'vehicle_finance' OR ${supportServices.name} ILIKE '%loan%' OR ${supportServices.name} ILIKE '%financ%' OR COALESCE(${supportServices.description}, '') ILIKE '%loan%' OR COALESCE(${supportServices.description}, '') ILIKE '%financ%' THEN 1 ELSE 0 END`),
        desc(supportServices.createdAt),
      )
      .limit(24);
    return this.addFirstGalleryImages(services, "support_service");
  }
  async createSupportService(service: InsertSupportService) {
    const [created] = await db.insert(supportServices).values(service).returning();
    return created;
  }

  async updateSupportService(id: string, data: Partial<SupportService>) {
    const [updated] = await db.update(supportServices).set(data).where(eq(supportServices.id, id)).returning();
    return updated;
  }

  async deleteSupportService(id: string) {
    await db.delete(supportServices).where(eq(supportServices.id, id));
  }

  async createReport(report: InsertBusinessReport) {
    const [created] = await db.insert(businessReports).values(report).returning();
    return created;
  }

  async getAllReports() {
    const allReports = await db.select().from(businessReports).orderBy(desc(businessReports.createdAt));
    const bizIds = Array.from(new Set(allReports.map(r => r.businessId)));
    if (bizIds.length === 0) return [];
    const bizList = await db.select({ id: businesses.id, name: businesses.name }).from(businesses).where(inArray(businesses.id, bizIds));
    const bizMap = Object.fromEntries(bizList.map(b => [b.id, b.name]));
    return allReports.map(r => ({ ...r, businessName: bizMap[r.businessId] || "Unknown" }));
  }

  async getGalleryImages(entityType: string, entityId: string) {
    return db.select().from(galleryImages)
      .where(and(eq(galleryImages.entityType, entityType), eq(galleryImages.entityId, entityId)))
      .orderBy(galleryImages.createdAt);
  }

  async addGalleryImage(image: InsertGalleryImage) {
    const [created] = await db.insert(galleryImages).values(image).returning();
    return created;
  }

  async deleteGalleryImage(id: string) {
    await db.delete(galleryImages).where(eq(galleryImages.id, id));
  }

  async getGalleryImageById(id: string) {
    const [img] = await db.select().from(galleryImages).where(eq(galleryImages.id, id));
    return img;
  }

  async getBusinessesByBrand(brand: string) {
    // Car dealers: have car listings with this brand
    const dealerCars = await db.select({ dealerId: cars.dealerId })
      .from(cars)
      .where(and(ilike(cars.brand, `%${brand}%`), eq(cars.suspended, false)));
    const dealerIds = Array.from(new Set(dealerCars.map(c => c.dealerId)));

    const dealerList = dealerIds.length > 0
      ? await db.select().from(businesses).where(
          and(eq(businesses.status, "approved"), eq(businesses.suspended, false), inArray(businesses.id, dealerIds))
        )
      : [];

    // Spare parts dealers with this brand in carBrands
    const sparePartsList = await db.select().from(businesses).where(
      and(
        eq(businesses.status, "approved"),
        eq(businesses.suspended, false),
        eq(businesses.category, "spare_parts"),
        sql`${businesses.carBrands} @> ARRAY[${brand}]::text[]`
      )
    );

    // Garages with this brand in carBrands
    const garageList = await db.select().from(businesses).where(
      and(
        eq(businesses.status, "approved"),
        eq(businesses.suspended, false),
        eq(businesses.category, "garage"),
        sql`${businesses.carBrands} @> ARRAY[${brand}]::text[]`
      )
    );

    const withRatings = async (list: Business[]) => {
      const rated = await Promise.all(list.map(async b => {
        const { avgRating, reviewCount } = await this.getAvgRating(b.id);
        return { ...b, avgRating, reviewCount };
      }));
      return this.addFirstGalleryImages(rated, "business");
    };

    return {
      dealers: await withRatings(dealerList),
      spareParts: await withRatings(sparePartsList),
      garages: await withRatings(garageList),
    };
  }
}

export const storage = new DatabaseStorage();
