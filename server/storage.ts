import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, like, ilike, and, or, sql, gte } from "drizzle-orm";
import {
  users, businesses, spareParts, reviews, messages,
  type User, type InsertUser,
  type Business, type InsertBusiness,
  type SparePart, type InsertSparePart,
  type Review, type InsertReview,
  type Message, type InsertMessage,
} from "@shared/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool);

export interface IStorage {
  // Users
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Businesses
  getBusinessById(id: string): Promise<Business | undefined>;
  getBusinessByOwnerId(ownerId: string): Promise<Business | undefined>;
  getAllBusinesses(filters?: { category?: string; city?: string; q?: string; minRating?: number }): Promise<(Business & { avgRating: number; reviewCount: number })[]>;
  getFeaturedBusinesses(): Promise<(Business & { avgRating: number; reviewCount: number })[]>;
  createBusiness(biz: InsertBusiness): Promise<Business>;
  updateBusiness(id: string, data: Partial<Business>): Promise<Business>;
  deleteBusiness(id: string): Promise<void>;
  getPendingBusinesses(): Promise<Business[]>;
  getApprovedBusinesses(): Promise<Business[]>;

  // Spare Parts
  getSparePartsByBusinessId(businessId: string): Promise<SparePart[]>;
  createSparePart(part: InsertSparePart): Promise<SparePart>;
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

  async getAllBusinesses(filters?: { category?: string; city?: string; q?: string; minRating?: number }) {
    const conditions = [eq(businesses.status, "approved")];

    if (filters?.category) conditions.push(eq(businesses.category, filters.category as any));
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

  async getFeaturedBusinesses() {
    const bizList = await db.select().from(businesses).where(eq(businesses.status, "approved")).orderBy(businesses.createdAt).limit(6);
    return Promise.all(
      bizList.map(async (biz) => {
        const { avgRating, reviewCount } = await this.getAvgRating(biz.id);
        return { ...biz, avgRating, reviewCount };
      })
    );
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
    await db.delete(businesses).where(eq(businesses.id, id));
  }

  async getPendingBusinesses() {
    return db.select().from(businesses).where(eq(businesses.status, "pending")).orderBy(businesses.createdAt);
  }

  async getApprovedBusinesses() {
    return db.select().from(businesses).where(eq(businesses.status, "approved")).orderBy(businesses.createdAt);
  }

  async getSparePartsByBusinessId(businessId: string) {
    return db.select().from(spareParts).where(eq(spareParts.businessId, businessId)).orderBy(spareParts.createdAt);
  }

  async createSparePart(part: InsertSparePart) {
    const [created] = await db.insert(spareParts).values(part).returning();
    return created;
  }

  async deleteSparePart(id: string) {
    await db.delete(spareParts).where(eq(spareParts.id, id));
  }

  async getReviewsByBusinessId(businessId: string) {
    return db.select().from(reviews).where(eq(reviews.businessId, businessId)).orderBy(reviews.createdAt);
  }

  async getAllReviews() {
    const result = await db
      .select({
        id: reviews.id,
        businessId: reviews.businessId,
        name: reviews.name,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        businessName: businesses.name,
      })
      .from(reviews)
      .leftJoin(businesses, eq(reviews.businessId, businesses.id))
      .orderBy(reviews.createdAt);
    return result.map(r => ({ ...r, businessName: r.businessName || "Unknown" }));
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
}

export const storage = new DatabaseStorage();
