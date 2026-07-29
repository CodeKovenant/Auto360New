import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, ilike, and, or, sql, gte, lte, desc, inArray, notInArray, isNull } from "drizzle-orm";
import {
  users, businesses, spareParts, reviews, messages, cars, garageServices, supportServices, businessReports, galleryImages,
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
  getAllUsers(): Promise<User[]>;

  // Businesses
  getBusinessById(id: string): Promise<Business | undefined>;
  getBusinessByOwnerId(ownerId: string): Promise<Business | undefined>;
  getAllBusinesses(filters?: { category?: string; subcategory?: string; city?: string; q?: string; minRating?: number }): Promise<(Business & { avgRating: number; reviewCount: number })[]>;
  getFeaturedBusinesses(): Promise<(Business & { avgRating: number; reviewCount: number })[]>;
  getPremiumBusinesses(): Promise<(Business & { avgRating: number; reviewCount: number })[]>;
  getHomepageBusinessSections(limitPerCategory: number): Promise<Record<string, (Business & { avgRating: number; reviewCount: number })[]>>;
  createBusiness(biz: InsertBusiness): Promise<Business>;
  updateBusiness(id: string, data: Partial<Business>): Promise<Business>;
  deleteBusiness(id: string): Promise<void>;
  getPendingBusinesses(): Promise<Business[]>;
  getApprovedBusinesses(): Promise<Business[]>;
  getRejectedBusinesses(): Promise<Business[]>;

  // Spare Parts
  getSparePartsByBusinessId(businessId: string): Promise<SparePart[]>;
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
  getCars(filters?: { brand?: string; minPrice?: number; maxPrice?: number; minYear?: number; maxYear?: number; location?: string; q?: string; dealerId?: string; condition?: string }): Promise<(Car & { dealerName: string; dealerWhatsapp: string })[]>;
  getFeaturedCars(): Promise<(Car & { dealerName: string; dealerWhatsapp: string })[]>;
  getCarById(id: string): Promise<(Car & { dealerName: string; dealerWhatsapp: string }) | undefined>;
  getCarsByDealerId(dealerId: string): Promise<Car[]>;
  createCar(car: InsertCar): Promise<Car>;
  updateCar(id: string, data: Partial<Car>): Promise<Car>;
  deleteCar(id: string): Promise<void>;

  // Garage Services
  getGarageServices(filters?: { q?: string; location?: string; minPrice?: number; maxPrice?: number; garageId?: string }): Promise<(GarageService & { garageName: string; garageWhatsapp: string; garageCity: string })[]>;
  getPopularGarageServices(): Promise<(GarageService & { garageName: string; garageWhatsapp: string; garageCity: string })[]>;
  getGarageServicesByGarageId(garageId: string): Promise<GarageService[]>;
  createGarageService(service: InsertGarageService): Promise<GarageService>;
  updateGarageService(id: string, data: Partial<GarageService>): Promise<GarageService>;
  deleteGarageService(id: string): Promise<void>;

  // Support Services
  getSupportServicesByBusinessId(businessId: string): Promise<SupportService[]>;
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
    dealers: (Business & { avgRating: number; reviewCount: number })[];
    spareParts: (Business & { avgRating: number; reviewCount: number })[];
    garages: (Business & { avgRating: number; reviewCount: number })[];
  }>;
}

export class DatabaseStorage implements IStorage {
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
    return db.select().from(users).orderBy(users.createdAt);
  }

  async getBusinessById(id: string) {
    const [biz] = await db.select().from(businesses).where(eq(businesses.id, id));
    return biz;
  }

  async getBusinessByOwnerId(ownerId: string) {
    const [biz] = await db.select().from(businesses).where(eq(businesses.ownerId, ownerId));
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
    const conditions = [eq(businesses.status, "approved")];
    if (filters?.category) {
      if (filters.category === "automotive_support") {
        if (filters.subcategory === "car_wash_detailing") {
          conditions.push(eq(businesses.category, "car_wash"));
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
    const bizList = await db.select().from(businesses).where(and(...conditions)).orderBy(businesses.createdAt);
    const bizWithRatings = await Promise.all(
      bizList.map(async (biz) => {
        const { avgRating, reviewCount } = await this.getAvgRating(biz.id);
        return { ...biz, avgRating, reviewCount };
      })
    );
    if (filters?.minRating && filters.minRating > 0) {
      return bizWithRatings.filter(b => b.avgRating >= filters.minRating!);
    }
    return bizWithRatings;
  }

  async getPremiumBusinesses() {
    await clearPremiumFlagsPastExpiryInDb();
    const bizList = await db
      .select()
      .from(businesses)
      .where(and(eq(businesses.status, "approved"), sql`${businesses.premium} IS TRUE`, premiumSubscriptionStillActive()))
      .orderBy(businesses.createdAt);
    return Promise.all(
      bizList.map(async (biz) => {
        const { avgRating, reviewCount } = await this.getAvgRating(biz.id);
        return { ...biz, avgRating, reviewCount };
      })
    );
  }

  async getFeaturedBusinesses() {
    const bizList = await db.select().from(businesses).where(eq(businesses.status, "approved")).orderBy(businesses.createdAt).limit(6);
    return Promise.all(
      bizList.map(async (biz) => {
        const { avgRating, reviewCount } = await this.getAvgRating(biz.id);
        return { ...biz, avgRating, reviewCount };
      })
    );
  }

  async getHomepageBusinessSections(limitPerCategory: number) {
    await clearPremiumFlagsPastExpiryInDb();
    const categories = ["car_dealer", "garage", "spare_parts", "car_wash", "insurance", "other"] as const;
    const cap = Math.max(1, Math.min(limitPerCategory, 24));
    const result: Record<string, (Business & { avgRating: number; reviewCount: number })[]> = {};

    for (const category of categories) {
      const premiumRaw = await db
        .select()
        .from(businesses)
        .where(
          and(
            eq(businesses.status, "approved"),
            sql`${businesses.premium} IS TRUE`,
            eq(businesses.category, category),
            premiumSubscriptionStillActive()
          )
        )
        .orderBy(desc(businesses.createdAt));

      const premiumSlice = premiumRaw.slice(0, cap);
      const ids = new Set(premiumSlice.map((b) => b.id));
      const need = cap - premiumSlice.length;
      let filler: Business[] = [];
      if (need > 0) {
        const nonPremium = sql`${businesses.premium} IS NOT TRUE`;
        const base = and(
          eq(businesses.status, "approved"),
          eq(businesses.category, category),
          nonPremium
        );
        filler =
          ids.size === 0
            ? await db.select().from(businesses).where(base).orderBy(desc(businesses.createdAt)).limit(need)
            : await db
                .select()
                .from(businesses)
                .where(and(base, notInArray(businesses.id, Array.from(ids))))
                .orderBy(desc(businesses.createdAt))
                .limit(need);
      }

      const merged = [...premiumSlice, ...filler]
        .sort((a, b) => Number(!!b.premium) - Number(!!a.premium))
        .slice(0, cap);
      result[category] = await Promise.all(
        merged.map(async (biz) => {
          const { avgRating, reviewCount } = await this.getAvgRating(biz.id);
          return { ...biz, avgRating, reviewCount };
        })
      );
    }

    return result;
  }

  async createBusiness(biz: InsertBusiness) {
    const [created] = await db.insert(businesses).values(biz).returning();
    return created;
  }

  async updateBusiness(id: string, data: Partial<Business>) {
    const [updated] = await db.update(businesses).set(data).where(eq(businesses.id, id)).returning();
    return updated;
  }

  async deleteBusiness(id: string) {
    await db.delete(spareParts).where(eq(spareParts.businessId, id));
    await db.delete(reviews).where(eq(reviews.businessId, id));
    await db.delete(messages).where(eq(messages.businessId, id));
    await db.delete(cars).where(eq(cars.dealerId, id));
    await db.delete(garageServices).where(eq(garageServices.garageId, id));
    await db.delete(supportServices).where(eq(supportServices.businessId, id));
    await db.delete(businesses).where(eq(businesses.id, id));
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

  async getSparePartsByBusinessId(businessId: string) {
    return db.select().from(spareParts).where(eq(spareParts.businessId, businessId)).orderBy(spareParts.createdAt);
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
    const bizIds = [...new Set(allReviews.map(r => r.businessId))];
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
  private async enrichCar(car: Car): Promise<Car & { dealerName: string; dealerWhatsapp: string }> {
    const [dealer] = await db.select({ name: businesses.name, whatsapp: businesses.whatsapp }).from(businesses).where(eq(businesses.id, car.dealerId));
    return { ...car, dealerName: dealer?.name || "Unknown", dealerWhatsapp: dealer?.whatsapp || "" };
  }

  async getCars(filters?: { brand?: string; minPrice?: number; maxPrice?: number; minYear?: number; maxYear?: number; location?: string; q?: string; dealerId?: string; condition?: string }) {
    const conditions: any[] = [];
    if (filters?.brand) conditions.push(ilike(cars.brand, `%${filters.brand}%`));
    if (filters?.location) conditions.push(ilike(cars.location, `%${filters.location}%`));
    if (filters?.dealerId) conditions.push(eq(cars.dealerId, filters.dealerId));
    if (filters?.minPrice) conditions.push(gte(cars.price, String(filters.minPrice)));
    if (filters?.maxPrice) conditions.push(lte(cars.price, String(filters.maxPrice)));
    if (filters?.minYear) conditions.push(gte(cars.year, filters.minYear));
    if (filters?.maxYear) conditions.push(lte(cars.year, filters.maxYear));
    if (filters?.condition) conditions.push(eq(cars.condition, filters.condition as any));
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
    const approvedDealers = await db.select({ id: businesses.id }).from(businesses).where(and(eq(businesses.status, "approved"), eq(businesses.category, "car_dealer")));
    const dealerIds = approvedDealers.map(d => d.id);
    if (dealerIds.length === 0) return [];

    const carList = await db.select().from(cars)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(cars.createdAt));

    const filtered = carList.filter(c => dealerIds.includes(c.dealerId));
    return Promise.all(filtered.map(c => this.enrichCar(c)));
  }

  async getFeaturedCars() {
    const approvedDealers = await db.select({ id: businesses.id }).from(businesses).where(and(eq(businesses.status, "approved"), eq(businesses.category, "car_dealer")));
    const dealerIds = approvedDealers.map(d => d.id);
    if (dealerIds.length === 0) return [];
    const carList = await db.select().from(cars).where(eq(cars.featured, true)).orderBy(desc(cars.createdAt)).limit(6);
    const filtered = carList.filter(c => dealerIds.includes(c.dealerId));
    if (filtered.length < 4) {
      const all = await db.select().from(cars).orderBy(desc(cars.createdAt)).limit(6);
      const allFiltered = all.filter(c => dealerIds.includes(c.dealerId));
      return Promise.all(allFiltered.slice(0, 6).map(c => this.enrichCar(c)));
    }
    return Promise.all(filtered.map(c => this.enrichCar(c)));
  }

  async getCarById(id: string) {
    const [car] = await db.select().from(cars).where(eq(cars.id, id));
    if (!car) return undefined;
    return this.enrichCar(car);
  }

  async getCarsByDealerId(dealerId: string) {
    return db.select().from(cars).where(eq(cars.dealerId, dealerId)).orderBy(desc(cars.createdAt));
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
  private async enrichService(svc: GarageService): Promise<GarageService & { garageName: string; garageWhatsapp: string; garageCity: string }> {
    const [garage] = await db.select({ name: businesses.name, whatsapp: businesses.whatsapp, city: businesses.city }).from(businesses).where(eq(businesses.id, svc.garageId));
    return { ...svc, garageName: garage?.name || "Unknown", garageWhatsapp: garage?.whatsapp || "", garageCity: garage?.city || "" };
  }

  async getGarageServices(filters?: { q?: string; location?: string; garageId?: string }) {
    const conditions: any[] = [];
    if (filters?.garageId) conditions.push(eq(garageServices.garageId, filters.garageId));
    if (filters?.q) {
      conditions.push(or(ilike(garageServices.name, `%${filters.q}%`), ilike(garageServices.description, `%${filters.q}%`))!);
    }

    const approvedGarages = await db.select({ id: businesses.id }).from(businesses).where(and(eq(businesses.status, "approved"), eq(businesses.category, "garage")));
    const garageIds = approvedGarages.map(g => g.id);
    if (garageIds.length === 0) return [];

    const svcList = await db.select().from(garageServices)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(garageServices.createdAt));

    let filtered = svcList.filter(s => garageIds.includes(s.garageId));
    if (filters?.location) {
      const loc = filters.location.toLowerCase();
      const enriched = await Promise.all(filtered.map(s => this.enrichService(s)));
      return enriched.filter(s => s.garageCity.toLowerCase().includes(loc));
    }
    return Promise.all(filtered.map(s => this.enrichService(s)));
  }

  async getPopularGarageServices() {
    const approvedGarages = await db.select({ id: businesses.id }).from(businesses).where(and(eq(businesses.status, "approved"), eq(businesses.category, "garage")));
    const garageIds = approvedGarages.map(g => g.id);
    if (garageIds.length === 0) return [];

    const svcList = await db.select().from(garageServices).where(eq(garageServices.popular, true)).orderBy(desc(garageServices.createdAt)).limit(6);
    let filtered = svcList.filter(s => garageIds.includes(s.garageId));
    if (filtered.length < 3) {
      const all = await db.select().from(garageServices).orderBy(desc(garageServices.createdAt)).limit(6);
      filtered = all.filter(s => garageIds.includes(s.garageId)).slice(0, 6);
    }
    return Promise.all(filtered.map(s => this.enrichService(s)));
  }

  async getGarageServicesByGarageId(garageId: string) {
    return db.select().from(garageServices).where(eq(garageServices.garageId, garageId)).orderBy(desc(garageServices.createdAt));
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
  async getSupportServicesByBusinessId(businessId: string) {
    return db.select().from(supportServices).where(eq(supportServices.businessId, businessId)).orderBy(desc(supportServices.createdAt));
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
    const bizIds = [...new Set(allReports.map(r => r.businessId))];
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
      .where(ilike(cars.brand, `%${brand}%`));
    const dealerIds = [...new Set(dealerCars.map(c => c.dealerId))];

    const dealerList = dealerIds.length > 0
      ? await db.select().from(businesses).where(
          and(eq(businesses.status, "approved"), inArray(businesses.id, dealerIds))
        )
      : [];

    // Spare parts dealers with this brand in carBrands
    const sparePartsList = await db.select().from(businesses).where(
      and(
        eq(businesses.status, "approved"),
        eq(businesses.category, "spare_parts"),
        sql`${businesses.carBrands} @> ARRAY[${brand}]::text[]`
      )
    );

    // Garages with this brand in carBrands
    const garageList = await db.select().from(businesses).where(
      and(
        eq(businesses.status, "approved"),
        eq(businesses.category, "garage"),
        sql`${businesses.carBrands} @> ARRAY[${brand}]::text[]`
      )
    );

    const withRatings = async (list: Business[]) =>
      Promise.all(list.map(async b => {
        const { avgRating, reviewCount } = await this.getAvgRating(b.id);
        return { ...b, avgRating, reviewCount };
      }));

    return {
      dealers: await withRatings(dealerList),
      spareParts: await withRatings(sparePartsList),
      garages: await withRatings(garageList),
    };
  }
}

export const storage = new DatabaseStorage();
