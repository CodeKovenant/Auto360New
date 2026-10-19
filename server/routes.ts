import type { Express } from "express";
import express from "express";
import { and, desc, eq } from "drizzle-orm";
import { createServer, type Server } from "http";
import {
  storage, db, ensurePersistentUploadsTable, savePersistentUpload, getPersistentUpload,
  hasPersistentUpload, deletePersistentUpload, createCarIfNotDuplicate, createSparePartIfNotDuplicate,
} from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";
import { AUTOMOTIVE_SUPPORT_SUBCATEGORIES, insertUserSchema, insertBusinessSchema, insertSparePartSchema, insertReviewSchema, insertMessageSchema, insertCarSchema, insertGarageServiceSchema, insertSupportServiceSchema, insertBusinessReportSchema, businesses, cars, spareParts, garageServices, supportServices, reviews, businessReports, galleryImages, featureRequests, mpesaPayments, featureRequestItemTypeEnum, users, type FeatureRequestItemType, type GalleryImage } from "@shared/schema";
import { initiateSTKPush, PREMIUM_AMOUNT, PREMIUM_DAYS } from "./mpesa";
import { sendVerificationEmail, sendAdminNotificationEmail, sendApprovalEmail, sendRejectionEmail, sendRegistrationConfirmationEmail, ADMIN_EMAIL, isMailConfigured } from "./mailer";

// Ensure uploads directories exist
const logosDir = path.resolve(process.cwd(), "uploads/logos");
const bannersDir = path.resolve(process.cwd(), "uploads/banners");
const partsDir = path.resolve(process.cwd(), "uploads/parts");
const galleryDir = path.resolve(process.cwd(), "uploads/gallery");
if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true });
if (!fs.existsSync(bannersDir)) fs.mkdirSync(bannersDir, { recursive: true });
if (!fs.existsSync(partsDir)) fs.mkdirSync(partsDir, { recursive: true });
if (!fs.existsSync(galleryDir)) fs.mkdirSync(galleryDir, { recursive: true });

function makeUpload() {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith("image/")) cb(null, true);
      else cb(new Error("Only image files are allowed"));
    },
  });
}

function contentTypeForLegacyUpload(filename: string): string {
  const types: Record<string, string> = {
    ".avif": "image/avif", ".gif": "image/gif", ".jpeg": "image/jpeg", ".jpg": "image/jpeg",
    ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp",
  };
  return types[path.extname(filename).toLowerCase()] || "application/octet-stream";
}

async function saveUploadedFile(file: any, folder: string, prefix: string): Promise<string> {
  const rawExtension = path.extname(file.originalname).toLowerCase();
  const extension = /^\.[a-z0-9]{1,10}$/.test(rawExtension) ? rawExtension : "";
  const filename = prefix + "-" + Date.now() + "-" + crypto.randomUUID() + extension;
  const storageKey = folder + "/" + filename;
  await savePersistentUpload(storageKey, file.mimetype || contentTypeForLegacyUpload(filename), file.buffer);
  return "/uploads/" + storageKey;
}

async function migrateLegacyUploads(): Promise<number> {
  const folders = ["logos", "banners", "parts", "gallery"];
  let migrated = 0;
  for (const folder of folders) {
    const directory = path.resolve(process.cwd(), "uploads", folder);
    if (!fs.existsSync(directory)) continue;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const storageKey = folder + "/" + entry.name;
      if (await hasPersistentUpload(storageKey)) continue;
      const filePath = path.join(directory, entry.name);
      const content = fs.readFileSync(filePath);
      await savePersistentUpload(storageKey, contentTypeForLegacyUpload(entry.name), content);
      migrated++;
    }
  }
  return migrated;
}

const logoUpload = makeUpload();
const bannerUpload = makeUpload();
const partImageUpload = makeUpload();
const galleryUpload = makeUpload();

function handleGalleryUpload(req: any, res: any, next: any) {
  galleryUpload.single("image")(req, res, (error: unknown) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "Image must be 5 MB or smaller" });
    }
    if (error instanceof Error) return res.status(400).json({ message: error.message });
    return next(error);
  });
}

const JWT_SECRET = process.env.SESSION_SECRET || (process.env.NODE_ENV === "production" ? "" : "autodirectory-secret-key");

function authMiddleware(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorized" });
  try {
    const token = auth.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as any;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

function adminMiddleware(req: any, res: any, next: any) {
  authMiddleware(req, res, () => {
    if (req.user?.role !== "admin") return res.status(403).json({ message: "Admin access required" });
    next();
  });
}

function ownerMiddleware(req: any, res: any, next: any) {
  authMiddleware(req, res, () => {
    if (req.user?.role !== "owner" && req.user?.role !== "admin") return res.status(403).json({ message: "Owner access required" });
    next();
  });
}

async function getListingBusinessId(type: string, id: string): Promise<string | undefined> {
  switch (type) {
    case "car": {
      const [item] = await db.select({ businessId: cars.dealerId }).from(cars).where(eq(cars.id, id));
      return item?.businessId;
    }
    case "part":
    case "spare_part": {
      const [item] = await db.select({ businessId: spareParts.businessId }).from(spareParts).where(eq(spareParts.id, id));
      return item?.businessId;
    }
    case "garage_service": {
      const [item] = await db.select({ businessId: garageServices.garageId }).from(garageServices).where(eq(garageServices.id, id));
      return item?.businessId;
    }
    case "support_service": {
      const [item] = await db.select({ businessId: supportServices.businessId }).from(supportServices).where(eq(supportServices.id, id));
      return item?.businessId;
    }
    case "business": {
      const [business] = await db.select({ businessId: businesses.id }).from(businesses).where(eq(businesses.id, id));
      return business?.businessId;
    }
    default:
      return undefined;
  }
}

async function actorCanManageBusiness(actor: any, businessId: string): Promise<boolean> {
  if (actor?.role === "admin") return true;
  if (actor?.role !== "owner") return false;
  const business = await storage.getBusinessById(businessId);
  return business?.ownerId === actor.id;
}

async function actorCanManageListing(actor: any, type: string, id: string): Promise<boolean> {
  const businessId = await getListingBusinessId(type, id);
  return !!businessId && actorCanManageBusiness(actor, businessId);
}

async function actorCanManageGalleryImage(actor: any, image: GalleryImage): Promise<boolean> {
  return actorCanManageListing(actor, image.entityType, image.entityId);
}

function pickFields(body: unknown, fields: string[]) {
  const values = body && typeof body === "object" && !Array.isArray(body)
    ? body as Record<string, unknown>
    : {};
  const allowed = new Set(fields);
  return Object.fromEntries(Object.entries(values).filter(([key]) => allowed.has(key)));
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be set in production");
  }
  await ensurePersistentUploadsTable();
  const migratedUploads = await migrateLegacyUploads();
  if (migratedUploads > 0) console.log("[uploads] migrated " + migratedUploads + " legacy files to PostgreSQL");

  // Prefer durable database-backed media; retain local static fallback for legacy assets.
  app.use("/uploads", async (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    const storageKey = req.path.replace(/^\/+/, "");
    if (!storageKey || storageKey.includes("..") || storageKey.includes("\\")) return next();
    try {
      const upload = await getPersistentUpload(storageKey);
      if (!upload) return next();
      res.setHeader("Content-Type", upload.contentType);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      return res.send(upload.data);
    } catch (error) {
      return next(error);
    }
  });
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

  app.post("/api/upload/logo", authMiddleware, logoUpload.single("logo"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const url = await saveUploadedFile(req.file, "logos", "logo");
      res.json({ url });
    } catch (e: any) {
      console.error("[uploads] logo persistence failed:", e.message);
      res.status(500).json({ message: "Could not store uploaded logo" });
    }
  });

  app.post("/api/upload/banner", authMiddleware, bannerUpload.single("banner"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const url = await saveUploadedFile(req.file, "banners", "banner");
      res.json({ url });
    } catch (e: any) {
      console.error("[uploads] banner persistence failed:", e.message);
      res.status(500).json({ message: "Could not store uploaded banner" });
    }
  });

  app.post("/api/upload/part-image", authMiddleware, partImageUpload.single("image"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const url = await saveUploadedFile(req.file, "parts", "part");
      res.json({ url });
    } catch (e: any) {
      console.error("[uploads] part image persistence failed:", e.message);
      res.status(500).json({ message: "Could not store uploaded part image" });
    }
  });

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const body = insertUserSchema.parse({
        ...pickFields(req.body, ["name", "email", "password"]),
        role: "owner",
      });
      body.email = body.email.trim().toLowerCase();
      const existing = await storage.getUserByEmail(body.email);
      if (existing) return res.status(400).json({ message: "Email already registered" });
      const hashed = await bcrypt.hash(body.password, 10);
      const user = await storage.createUser({ ...body, password: hashed });
      const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
      res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
    } catch (e: any) {
      if (e.code === "23505") return res.status(409).json({ message: "Email already registered" });
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
      const { password } = req.body || {};
      if (!email || !password) return res.status(400).json({ message: "Email and password required" });
      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(401).json({ message: "Invalid email or password" });
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ message: "Invalid email or password" });
      const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
      res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Business routes
  app.get("/api/businesses/featured", async (req, res) => {
    try {
      const biz = await storage.getFeaturedBusinesses();
      res.json(biz);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/businesses/premium", async (req, res) => {
    try {
      const biz = await storage.getPremiumBusinesses();
      res.json(biz);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/businesses/home-sections", async (req, res) => {
    try {
      const raw = parseInt(String(req.query.limit ?? "6"), 10);
      const limit = Number.isFinite(raw) ? raw : 6;
      const sections = await storage.getHomepageBusinessSections(limit);
      res.json(sections);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/mpesa/config", ownerMiddleware, async (req, res) => {
    if ((req as any).user?.role !== "owner") return res.status(403).json({ message: "Only business owners can access payment settings" });
    res.json({
      amount: PREMIUM_AMOUNT,
      days: PREMIUM_DAYS,
      configured: !!(process.env.MPESA_CONSUMER_KEY && process.env.MPESA_SHORTCODE && process.env.MPESA_CALLBACK_URL),
    });
  });

  app.post("/api/mpesa/initiate", ownerMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user.role !== "owner") return res.status(403).json({ message: "Only business owners can make premium payments" });
      const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : "";
      if (!phone) return res.status(400).json({ message: "Phone number required" });
      const biz = await storage.getBusinessByOwnerId(user.id);
      if (!biz) return res.status(404).json({ message: "No business found" });
      if (biz.status !== "approved") return res.status(403).json({ message: "Business must be approved first" });
      if (biz.suspended) return res.status(403).json({ message: "Suspended businesses cannot activate premium" });

      const result = await initiateSTKPush(phone, biz.id, biz.name);
      if (!result.CheckoutRequestID) throw new Error("M-Pesa did not return a checkout request id");
      await db.insert(mpesaPayments).values({
        businessId: biz.id,
        checkoutRequestId: result.CheckoutRequestID,
        amount: PREMIUM_AMOUNT,
      });
      res.json({ success: true, message: "Payment request sent to your phone. Enter your M-Pesa PIN to confirm.", checkoutRequestId: result.CheckoutRequestID });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to initiate payment" });
    }
  });

  app.post("/api/mpesa/callback", async (req, res) => {
    try {
      const body = req.body?.Body?.stkCallback;
      if (!body || typeof body.CheckoutRequestID !== "string") {
        return res.status(400).json({ message: "Invalid M-Pesa callback payload" });
      }
      const checkoutRequestId = body.CheckoutRequestID;
      const resultCode = Number(body.ResultCode);
      const callbackItems = Array.isArray(body.CallbackMetadata?.Item) ? body.CallbackMetadata.Item : [];
      const paidAmount = Number(callbackItems.find((item: any) => item.Name === "Amount")?.Value);
      const receiptNumber = callbackItems.find((item: any) => item.Name === "MpesaReceiptNumber")?.Value;
      const result = await db.transaction(async tx => {
        const [payment] = await tx.select().from(mpesaPayments)
          .where(eq(mpesaPayments.checkoutRequestId, checkoutRequestId))
          .limit(1);
        if (!payment) return "unknown";
        if (payment.status !== "pending") return "duplicate";
        if (resultCode !== 0) {
          await tx.update(mpesaPayments)
            .set({ status: "failed" })
            .where(and(eq(mpesaPayments.id, payment.id), eq(mpesaPayments.status, "pending")));
          return "failed";
        }
        if (!Number.isFinite(paidAmount) || paidAmount !== payment.amount) return "amount_mismatch";

        const [completed] = await tx.update(mpesaPayments)
          .set({ status: "completed", receiptNumber: typeof receiptNumber === "string" ? receiptNumber : null, completedAt: new Date() })
          .where(and(eq(mpesaPayments.id, payment.id), eq(mpesaPayments.status, "pending")))
          .returning({ id: mpesaPayments.id });
        if (!completed) return "duplicate";

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + PREMIUM_DAYS);
        await tx.update(businesses)
          .set({ premium: true, premiumExpiresAt: expiresAt })
          .where(eq(businesses.id, payment.businessId));
        return "completed";
      });
      if (result === "unknown") {
        console.error("[mpesa] callback has unknown checkout request:", checkoutRequestId);
        return res.status(404).json({ message: "Unknown checkout request" });
      }
      if (result === "amount_mismatch") {
        console.error("[mpesa] callback amount did not match the stored payment:", checkoutRequestId);
        return res.status(200).json({ ResultCode: 0, ResultDesc: "Callback accepted; payment requires reconciliation" });
      }
      res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
    } catch (e: any) {
      console.error("[mpesa] callback processing failed:", e.message);
      res.status(500).json({ message: "M-Pesa callback could not be processed" });
    }
  });

  app.post("/api/mpesa/manual-activate", adminMiddleware, async (req, res) => {
    try {
      const { businessId, days } = req.body;
      if (!businessId) return res.status(400).json({ message: "businessId required" });
      const duration = days === undefined ? PREMIUM_DAYS : Number(days);
      if (!Number.isInteger(duration) || duration < 1 || duration > 365) return res.status(400).json({ message: "days must be an integer between 1 and 365" });
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + duration);
      const biz = await storage.updateBusiness(businessId, { premium: true, premiumExpiresAt: expiresAt });
      if (!biz) return res.status(404).json({ message: "Business not found" });
      res.json(biz);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/mpesa/manual-deactivate", adminMiddleware, async (req, res) => {
    try {
      const { businessId } = req.body;
      if (!businessId) return res.status(400).json({ message: "businessId required" });
      const biz = await storage.updateBusiness(businessId, { premium: false, premiumExpiresAt: null as any });
      if (!biz) return res.status(404).json({ message: "Business not found" });
      res.json(biz);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/businesses", async (req, res) => {
    try {
      const { q, category, subcategory, city, minRating } = req.query as Record<string, string>;
      const biz = await storage.getAllBusinesses({ q, category, subcategory, city, minRating: minRating ? parseFloat(minRating) : undefined });
      res.json(biz);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/businesses/:id", async (req, res) => {
    try {
      const business = await storage.getBusinessById(req.params.id);
      if (!business || business.status !== "approved" || business.suspended) {
        return res.status(404).json({ message: "Business not found" });
      }
      const [revs, parts, { avgRating, reviewCount }, supportSvcs] = await Promise.all([
        storage.getReviewsByBusinessId(req.params.id),
        storage.getSparePartsByBusinessId(req.params.id),
        storage.getAvgRating(req.params.id),
        storage.getSupportServicesByBusinessId(req.params.id),
      ]);
      res.json({ business: { ...business, avgRating, reviewCount }, reviews: revs, spareParts: parts, supportServices: supportSvcs });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/businesses", authMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user.role !== "owner") return res.status(403).json({ message: "Only business-owner accounts can register a business" });
      if (await storage.getBusinessByOwnerId(user.id)) return res.status(409).json({ message: "Your account already has a business profile" });
      const body = insertBusinessSchema.parse({
        ...pickFields(req.body, ["name", "category", "subcategory", "description", "phone", "whatsapp", "address", "city", "logo", "banner", "website", "latitude", "longitude", "carBrands"]),
        ownerId: user.id,
        premium: false,
        premiumExpiresAt: null,
        suspended: false,
      });
      const biz = await storage.createBusiness(body);

      // Generate email verification token and send emails (non-blocking)
      const token = crypto.randomBytes(32).toString("hex");
      await storage.updateUser(user.id, { emailVerificationToken: token });
      const fullUser = await storage.getUserById(user.id);
      const appDomain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(",")[0];
      const appUrl = appDomain ? `https://${appDomain}` : "http://localhost:5000";

      sendVerificationEmail({
        toEmail: fullUser?.email || user.email,
        toName: fullUser?.name || user.name,
        businessName: biz.name,
        token,
      }).catch(e => console.error("[mailer] verification email failed:", e.message));

      sendAdminNotificationEmail({
        businessName: biz.name,
        businessCategory: biz.category,
        businessCity: biz.city,
        ownerName: fullUser?.name || user.name,
        ownerEmail: fullUser?.email || user.email,
        adminUrl: `${appUrl}/admin`,
      }).catch(e => console.error("[mailer] admin notification failed:", e.message));

      sendRegistrationConfirmationEmail({
        toEmail: fullUser?.email || user.email,
        toName: fullUser?.name || user.name,
        businessName: biz.name,
        businessCategory: biz.category,
      }).catch(e => console.error("[mailer] registration confirmation email failed:", e.message));

      res.json({ ...biz, emailVerificationSent: isMailConfigured() });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Email verification
  app.get("/api/verify-email/:token", async (req, res) => {
    try {
      const user = await storage.getUserByVerificationToken(req.params.token);
      if (!user) return res.status(400).json({ message: "Invalid or expired verification link." });
      await storage.updateUser(user.id, {
        emailVerificationToken: null as any,
        emailVerifiedAt: new Date(),
      });
      res.json({ success: true, message: "Email verified successfully!" });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Check email verification status
  app.get("/api/me/email-verified", authMiddleware, async (req: any, res) => {
    try {
      const user = await storage.getUserById(req.user.id);
      res.json({ verified: !!user?.emailVerifiedAt, email: user?.email });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Resend verification email
  app.post("/api/me/resend-verification", authMiddleware, async (req: any, res) => {
    try {
      const user = await storage.getUserById(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.emailVerifiedAt) return res.status(400).json({ message: "Email already verified" });
      const biz = await storage.getBusinessByOwnerId(user.id);
      const token = crypto.randomBytes(32).toString("hex");
      await storage.updateUser(user.id, { emailVerificationToken: token });
      await sendVerificationEmail({
        toEmail: user.email,
        toName: user.name,
        businessName: biz?.name || "your business",
        token,
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.put("/api/businesses/me", ownerMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;
      const biz = await storage.getBusinessByOwnerId(user.id);
      if (!biz) return res.status(404).json({ message: "Business not found" });
      const ownerCannotSet = new Set([
        "id",
        "ownerId",
        "createdAt",
        "status",
        "premium",
        "premiumExpiresAt",
        "featured",
        "suspended",
      ]);
      const allowedFields = Object.fromEntries(
        Object.entries(req.body || {}).filter(([k]) => !ownerCannotSet.has(k))
      );
      if (Object.keys(allowedFields).length === 0) {
        return res.json(biz);
      }
      const parsed = insertBusinessSchema.partial().parse(allowedFields);
      const updated = await storage.updateBusiness(biz.id, parsed);
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Dashboard
  app.get("/api/dashboard", ownerMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;
      const business = await storage.getBusinessByOwnerId(user.id);
      if (!business) return res.json({ business: null, messages: [], reviews: [], spareParts: [], cars: [], garageServices: [], supportServices: [], featureRequests: [] });
      const isSupport = ["insurance", "car_wash", "other"].includes(business.category);
      const [msgs, revs, parts, carsData, servicesData, supportSvcs, ownerFeatureRequests] = await Promise.all([
        storage.getMessagesByBusinessId(business.id),
        storage.getReviewsByBusinessId(business.id),
        storage.getOwnerDashboardSparePartsByBusinessId(business.id),
        business.category === "car_dealer" ? storage.getOwnerDashboardCarsByDealerId(business.id) : Promise.resolve([]),
        business.category === "garage" ? storage.getOwnerDashboardGarageServicesByGarageId(business.id) : Promise.resolve([]),
        isSupport ? storage.getOwnerDashboardSupportServicesByBusinessId(business.id) : Promise.resolve([]),
        db.select().from(featureRequests).where(eq(featureRequests.ownerId, user.id)).orderBy(desc(featureRequests.createdAt)),
      ]);
      res.json({ business, messages: msgs, reviews: revs, spareParts: parts, cars: carsData, garageServices: servicesData, supportServices: supportSvcs, featureRequests: ownerFeatureRequests });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Admin routes
  app.get("/api/feature-requests/me", ownerMiddleware, async (req: any, res) => {
    try {
      const requests = await db.select().from(featureRequests)
        .where(eq(featureRequests.ownerId, req.user.id))
        .orderBy(desc(featureRequests.createdAt));
      const items = await Promise.all(requests.map(async request => {
        let name = "Unavailable item";
        switch (request.itemType) {
          case "business": {
            const [item] = await db.select({ name: businesses.name }).from(businesses).where(eq(businesses.id, request.itemId));
            name = item?.name ?? name;
            break;
          }
          case "car": {
            const [item] = await db.select({ name: cars.title }).from(cars).where(eq(cars.id, request.itemId));
            name = item?.name ?? name;
            break;
          }
          case "part": {
            const [item] = await db.select({ name: spareParts.partName }).from(spareParts).where(eq(spareParts.id, request.itemId));
            name = item?.name ?? name;
            break;
          }
          case "garage_service": {
            const [item] = await db.select({ name: garageServices.name }).from(garageServices).where(eq(garageServices.id, request.itemId));
            name = item?.name ?? name;
            break;
          }
          case "support_service": {
            const [item] = await db.select({ name: supportServices.name }).from(supportServices).where(eq(supportServices.id, request.itemId));
            name = item?.name ?? name;
            break;
          }
        }
        return { ...request, name };
      }));
      res.json(items);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/feature-requests", ownerMiddleware, async (req: any, res) => {
    try {
      if (req.user?.role !== "owner") return res.status(403).json({ message: "Only business owners can request featuring" });
      const { itemType, itemId } = req.body || {};
      if (!featureRequestItemTypeEnum.enumValues.includes(itemType) || typeof itemId !== "string" || !itemId.trim()) {
        return res.status(400).json({ message: "A valid item type and id are required" });
      }

      const ownerId = req.user.id;
      const id = itemId.trim();
      let ownedAndAvailable = false;
      let isFeatured = false;
      switch (itemType) {
        case "business": {
          const [item] = await db.select({ ownerId: businesses.ownerId, status: businesses.status, featured: businesses.featured, suspended: businesses.suspended })
            .from(businesses).where(eq(businesses.id, id));
          ownedAndAvailable = !!item && item.ownerId === ownerId && item.status === "approved" && !item.suspended;
          isFeatured = !!item?.featured;
          break;
        }
        case "car": {
          const [item] = await db.select({ ownerId: businesses.ownerId, status: businesses.status, itemFeatured: cars.featured, itemSuspended: cars.suspended, businessSuspended: businesses.suspended })
            .from(cars).innerJoin(businesses, eq(cars.dealerId, businesses.id)).where(eq(cars.id, id));
          ownedAndAvailable = !!item && item.ownerId === ownerId && item.status === "approved" && !item.itemSuspended && !item.businessSuspended;
          isFeatured = !!item?.itemFeatured;
          break;
        }
        case "part": {
          const [item] = await db.select({ ownerId: businesses.ownerId, status: businesses.status, itemFeatured: spareParts.featured, itemSuspended: spareParts.suspended, businessSuspended: businesses.suspended })
            .from(spareParts).innerJoin(businesses, eq(spareParts.businessId, businesses.id)).where(eq(spareParts.id, id));
          ownedAndAvailable = !!item && item.ownerId === ownerId && item.status === "approved" && !item.itemSuspended && !item.businessSuspended;
          isFeatured = !!item?.itemFeatured;
          break;
        }
        case "garage_service": {
          const [item] = await db.select({ ownerId: businesses.ownerId, status: businesses.status, itemFeatured: garageServices.featured, itemSuspended: garageServices.suspended, businessSuspended: businesses.suspended })
            .from(garageServices).innerJoin(businesses, eq(garageServices.garageId, businesses.id)).where(eq(garageServices.id, id));
          ownedAndAvailable = !!item && item.ownerId === ownerId && item.status === "approved" && !item.itemSuspended && !item.businessSuspended;
          isFeatured = !!item?.itemFeatured;
          break;
        }
        case "support_service": {
          const [item] = await db.select({ ownerId: businesses.ownerId, status: businesses.status, itemFeatured: supportServices.featured, itemSuspended: supportServices.suspended, businessSuspended: businesses.suspended })
            .from(supportServices).innerJoin(businesses, eq(supportServices.businessId, businesses.id)).where(eq(supportServices.id, id));
          ownedAndAvailable = !!item && item.ownerId === ownerId && item.status === "approved" && !item.itemSuspended && !item.businessSuspended;
          isFeatured = !!item?.itemFeatured;
          break;
        }
      }
      if (!ownedAndAvailable) return res.status(404).json({ message: "Item not found, not available, or not owned by your account" });
      if (isFeatured) return res.status(409).json({ message: "This item is already featured" });

      const [existing] = await db.select({ id: featureRequests.id }).from(featureRequests)
        .where(and(eq(featureRequests.itemType, itemType), eq(featureRequests.itemId, id), eq(featureRequests.status, "pending")));
      if (existing) return res.status(409).json({ message: "A feature request for this item is already pending" });
      const [created] = await db.insert(featureRequests).values({ ownerId, itemType, itemId: id }).returning();
      res.status(201).json(created);
    } catch (e: any) {
      if (e.code === "23505") return res.status(409).json({ message: "A feature request for this item is already pending" });
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/admin/feature-requests", adminMiddleware, async (_req, res) => {
    try {
      const requests = await db.select({
        id: featureRequests.id,
        ownerId: featureRequests.ownerId,
        itemType: featureRequests.itemType,
        itemId: featureRequests.itemId,
        status: featureRequests.status,
        createdAt: featureRequests.createdAt,
        ownerName: users.name,
        ownerEmail: users.email,
      }).from(featureRequests)
        .innerJoin(users, eq(featureRequests.ownerId, users.id))
        .where(eq(featureRequests.status, "pending"))
        .orderBy(desc(featureRequests.createdAt));
      const enriched = await Promise.all(requests.map(async request => {
        let itemName = "Unavailable item";
        switch (request.itemType) {
          case "business": {
            const [item] = await db.select({ name: businesses.name }).from(businesses).where(eq(businesses.id, request.itemId));
            itemName = item?.name ?? itemName;
            break;
          }
          case "car": {
            const [item] = await db.select({ name: cars.title }).from(cars).where(eq(cars.id, request.itemId));
            itemName = item?.name ?? itemName;
            break;
          }
          case "part": {
            const [item] = await db.select({ name: spareParts.partName }).from(spareParts).where(eq(spareParts.id, request.itemId));
            itemName = item?.name ?? itemName;
            break;
          }
          case "garage_service": {
            const [item] = await db.select({ name: garageServices.name }).from(garageServices).where(eq(garageServices.id, request.itemId));
            itemName = item?.name ?? itemName;
            break;
          }
          case "support_service": {
            const [item] = await db.select({ name: supportServices.name }).from(supportServices).where(eq(supportServices.id, request.itemId));
            itemName = item?.name ?? itemName;
            break;
          }
        }
        return { ...request, itemName };
      }));
      res.json(enriched);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.put("/api/admin/feature-requests/:id", adminMiddleware, async (req, res) => {
    try {
      const status = req.body?.status;
      if (status !== "approved" && status !== "rejected") {
        return res.status(400).json({ message: "status must be approved or rejected" });
      }
      const result = await db.transaction(async tx => {
        const [request] = await tx.select().from(featureRequests)
          .where(and(eq(featureRequests.id, req.params.id), eq(featureRequests.status, "pending")));
        if (!request) return { error: "Feature request not found or already reviewed" };

        if (status === "approved") {
          switch (request.itemType) {
            case "business": {
              const [item] = await tx.select().from(businesses).where(and(eq(businesses.id, request.itemId), eq(businesses.status, "approved"), eq(businesses.suspended, false)));
              if (!item) return { error: "Business must be approved and active before featuring" };
              await tx.update(businesses).set({ featured: true }).where(eq(businesses.id, request.itemId));
              break;
            }
            case "car": {
              const [item] = await tx.select({ id: cars.id }).from(cars).innerJoin(businesses, eq(cars.dealerId, businesses.id))
                .where(and(eq(cars.id, request.itemId), eq(cars.suspended, false), eq(businesses.status, "approved"), eq(businesses.suspended, false)));
              if (!item) return { error: "Car and its business must be active before featuring" };
              await tx.update(cars).set({ featured: true }).where(eq(cars.id, request.itemId));
              break;
            }
            case "part": {
              const [item] = await tx.select({ id: spareParts.id }).from(spareParts).innerJoin(businesses, eq(spareParts.businessId, businesses.id))
                .where(and(eq(spareParts.id, request.itemId), eq(spareParts.suspended, false), eq(businesses.status, "approved"), eq(businesses.suspended, false)));
              if (!item) return { error: "Spare part and its business must be active before featuring" };
              await tx.update(spareParts).set({ featured: true }).where(eq(spareParts.id, request.itemId));
              break;
            }
            case "garage_service": {
              const [item] = await tx.select({ id: garageServices.id }).from(garageServices).innerJoin(businesses, eq(garageServices.garageId, businesses.id))
                .where(and(eq(garageServices.id, request.itemId), eq(garageServices.suspended, false), eq(businesses.status, "approved"), eq(businesses.suspended, false)));
              if (!item) return { error: "Service and its business must be active before featuring" };
              await tx.update(garageServices).set({ featured: true }).where(eq(garageServices.id, request.itemId));
              break;
            }
            case "support_service": {
              const [item] = await tx.select({ id: supportServices.id }).from(supportServices).innerJoin(businesses, eq(supportServices.businessId, businesses.id))
                .where(and(eq(supportServices.id, request.itemId), eq(supportServices.suspended, false), eq(businesses.status, "approved"), eq(businesses.suspended, false)));
              if (!item) return { error: "Service and its business must be active before featuring" };
              await tx.update(supportServices).set({ featured: true }).where(eq(supportServices.id, request.itemId));
              break;
            }
          }
        }
        const [reviewed] = await tx.update(featureRequests)
          .set({ status, reviewedAt: new Date() })
          .where(and(eq(featureRequests.id, request.id), eq(featureRequests.status, "pending")))
          .returning();
        return reviewed ? { request: reviewed } : { error: "Feature request was already reviewed" };
      });
      if ("error" in result) return res.status(409).json({ message: result.error });
      res.json(result.request);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/admin/featured", adminMiddleware, async (_req, res) => {
    try {
      const approvedBusinesses = await storage.getApprovedBusinesses();
      const [cars, garageServices, sparePartGroups, supportServiceGroups] = await Promise.all([
        storage.getCars({ includeSuspended: true }),
        storage.getGarageServices({ includeSuspended: true }),
        Promise.all(
          approvedBusinesses
            .filter((biz) => biz.category === "spare_parts")
            .map((biz) => storage.getSparePartsByBusinessId(biz.id, true))
        ),
        Promise.all(
          approvedBusinesses
            .filter((biz) => ["insurance", "car_wash", "other"].includes(biz.category))
            .map((biz) => storage.getSupportServicesByBusinessId(biz.id, true))
        ),
      ]);
      const businessNames = new Map(approvedBusinesses.map((biz) => [biz.id, biz.name]));
      const items = [
        ...approvedBusinesses.map((biz) => ({
          id: biz.id,
          type: "business",
          name: biz.name,
          subtitle: `${biz.category.replace(/_/g, " ")} Â· ${biz.city}`,
          featured: !!biz.featured,
          status: biz.status,
          suspended: !!biz.suspended,
        })),
        ...cars.map((car) => ({
          id: car.id,
          type: "car",
          name: car.title,
          subtitle: `${car.brand} ${car.model} Â· ${car.dealerName}`,
          featured: !!car.featured,
          suspended: !!car.suspended,
          description: car.description,
          price: String(car.price),
        })),
        ...garageServices.map((service) => ({
          id: service.id,
          type: "garage_service",
          name: service.name,
          subtitle: `Garage service Â· ${service.garageName}`,
          featured: !!service.featured,
          suspended: !!service.suspended,
          description: service.description,
          price: service.price,
        })),
        ...sparePartGroups.flat().map((part) => ({
          id: part.id,
          type: "part",
          name: part.partName,
          subtitle: `Spare part Â· ${businessNames.get(part.businessId) || "Business"}`,
          featured: !!part.featured,
          suspended: !!part.suspended,
          description: part.description,
          price: part.price,
        })),
        ...supportServiceGroups.flat().map((service) => ({
          id: service.id,
          type: "support_service",
          name: service.name,
          subtitle: `Automotive support Â· ${businessNames.get(service.businessId) || "Business"}`,
          featured: !!service.featured,
          suspended: !!service.suspended,
          description: service.description,
          price: service.startingPrice,
        })),
      ].sort((a, b) => Number(b.featured) - Number(a.featured) || a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
      res.json(items);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.put("/api/admin/featured/:type/:id", adminMiddleware, async (req, res) => {
    try {
      const { type, id } = req.params;
      if (!["business", "car", "part", "garage_service", "support_service"].includes(type)) {
        return res.status(400).json({ message: "Unsupported featured item type" });
      }
      if (typeof req.body?.featured !== "boolean") {
        return res.status(400).json({ message: "featured must be a boolean" });
      }

      if (req.body.featured) {
        let eligible = false;
        switch (type) {
          case "business": {
            const [business] = await db.select({ id: businesses.id }).from(businesses)
              .where(and(eq(businesses.id, id), eq(businesses.status, "approved"), eq(businesses.suspended, false)));
            eligible = !!business;
            break;
          }
          case "car": {
            const [car] = await db.select({ id: cars.id }).from(cars).innerJoin(businesses, eq(cars.dealerId, businesses.id))
              .where(and(eq(cars.id, id), eq(cars.suspended, false), eq(businesses.status, "approved"), eq(businesses.suspended, false)));
            eligible = !!car;
            break;
          }
          case "part": {
            const [part] = await db.select({ id: spareParts.id }).from(spareParts).innerJoin(businesses, eq(spareParts.businessId, businesses.id))
              .where(and(eq(spareParts.id, id), eq(spareParts.suspended, false), eq(businesses.status, "approved"), eq(businesses.suspended, false)));
            eligible = !!part;
            break;
          }
          case "garage_service": {
            const [service] = await db.select({ id: garageServices.id }).from(garageServices).innerJoin(businesses, eq(garageServices.garageId, businesses.id))
              .where(and(eq(garageServices.id, id), eq(garageServices.suspended, false), eq(businesses.status, "approved"), eq(businesses.suspended, false)));
            eligible = !!service;
            break;
          }
          case "support_service": {
            const [service] = await db.select({ id: supportServices.id }).from(supportServices).innerJoin(businesses, eq(supportServices.businessId, businesses.id))
              .where(and(eq(supportServices.id, id), eq(supportServices.suspended, false), eq(businesses.status, "approved"), eq(businesses.suspended, false)));
            eligible = !!service;
            break;
          }
        }
        if (!eligible) return res.status(409).json({ message: "Only active items from approved businesses can be featured." });
      }

      let item: any;
      switch (type) {
        case "business": {
          const business = await storage.getBusinessById(id);
          if (!business) return res.status(404).json({ message: "Business not found" });
          item = await storage.updateBusiness(id, { featured: req.body.featured });
          break;
        }
        case "car":
          item = await storage.updateCar(id, { featured: req.body.featured });
          break;
        case "part":
          item = await storage.updateSparePart(id, { featured: req.body.featured });
          break;
        case "garage_service":
          item = await storage.updateGarageService(id, { featured: req.body.featured });
          break;
        case "support_service":
          item = await storage.updateSupportService(id, { featured: req.body.featured });
          break;
      }
      if (!item) return res.status(404).json({ message: "Featured item not found" });
      res.json({ id: item.id, type, featured: !!item.featured });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/admin", adminMiddleware, async (req, res) => {
    try {
      const [pending, approved, rejected, allReviews, allUsers] = await Promise.all([
        storage.getPendingBusinesses(),
        storage.getApprovedBusinesses(),
        storage.getRejectedBusinesses(),
        storage.getAllReviews(),
        storage.getAllUsers(),
      ]);

      // Build per-business rating stats from reviews
      const ratingMap: Record<string, { total: number; count: number }> = {};
      for (const r of allReviews) {
        if (!ratingMap[r.businessId]) ratingMap[r.businessId] = { total: 0, count: 0 };
        ratingMap[r.businessId].total += r.rating;
        ratingMap[r.businessId].count += 1;
      }

      // Build user map for owner lookup
      const userMap: Record<string, { name: string; email: string }> = {};
      for (const u of allUsers) userMap[u.id] = { name: u.name, email: u.email };

      const enrich = (biz: any) => ({
        ...biz,
        avgRating: ratingMap[biz.id] ? ratingMap[biz.id].total / ratingMap[biz.id].count : 0,
        reviewCount: ratingMap[biz.id]?.count ?? 0,
        ownerName: biz.ownerId ? userMap[biz.ownerId]?.name ?? null : null,
        ownerEmail: biz.ownerId ? userMap[biz.ownerId]?.email ?? null : null,
      });

      res.json({
        stats: {
          total: pending.length + approved.length + rejected.length,
          pending: pending.length,
          approved: approved.length,
          rejected: rejected.length,
          totalReviews: allReviews.length,
        },
        pending: pending.map(enrich),
        approved: approved.map(enrich),
        rejected: rejected.map(enrich),
        reviews: allReviews,
        users: allUsers,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.put("/api/admin/businesses/:id", adminMiddleware, async (req, res) => {
    try {
      const business = await storage.getBusinessById(req.params.id);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const body = req.body || {};
      const editableFields = new Set(["name", "description", "phone", "whatsapp", "address", "city", "subcategory", "website", "logo", "banner", "latitude", "longitude", "carBrands"]);
      const submittedFields = Object.fromEntries(Object.entries(body).filter(([key]) => editableFields.has(key)));
      if (typeof submittedFields.name === "string" && !submittedFields.name.trim()) return res.status(400).json({ message: "Business name cannot be empty" });
      if (typeof submittedFields.phone === "string" && !submittedFields.phone.trim()) return res.status(400).json({ message: "Business phone cannot be empty" });
      const parsed = insertBusinessSchema.partial().parse(submittedFields);
      let ownerId: string | undefined;
      if (typeof body.ownerId === "string" && body.ownerId.trim()) {
        const owner = await storage.getUserById(body.ownerId.trim());
        if (!owner || owner.role !== "owner") return res.status(400).json({ message: "Choose an existing business-owner account" });
        const existingBusiness = await storage.getBusinessByOwnerId(owner.id);
        if (existingBusiness && existingBusiness.id !== business.id) return res.status(409).json({ message: "This account already manages another business" });
        ownerId = owner.id;
      }
      if (Object.keys(parsed).length === 0 && !ownerId) return res.json(business);
      const updated = await storage.updateBusiness(business.id, { ...parsed, ...(ownerId ? { ownerId } : {}) } as any);
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.put("/api/admin/businesses/:id/approve", adminMiddleware, async (req, res) => {
    try {
      const currentBusiness = await storage.getBusinessById(req.params.id);
      if (!currentBusiness) return res.status(404).json({ message: "Business not found" });
      const biz = await storage.updateBusiness(req.params.id, {
        status: "approved",
        ...(currentBusiness.status === "approved" ? {} : { featured: false }),
      });
      const owner = await storage.getUserById(biz.ownerId);
      if (owner) {
        sendApprovalEmail({ toEmail: owner.email, toName: owner.name, businessName: biz.name })
          .catch(e => console.error("[mailer] approval email failed:", e.message));
      }
      res.json(biz);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.put("/api/admin/businesses/:id/reject", adminMiddleware, async (req, res) => {
    try {
      const currentBusiness = await storage.getBusinessById(req.params.id);
      if (!currentBusiness) return res.status(404).json({ message: "Business not found" });
      const biz = await storage.updateBusiness(req.params.id, { status: "rejected" });
      if (!biz) return res.status(404).json({ message: "Business not found" });
      const owner = await storage.getUserById(biz.ownerId);
      if (owner) {
        sendRejectionEmail({ toEmail: owner.email, toName: owner.name, businessName: biz.name })
          .catch(e => console.error("[mailer] rejection email failed:", e.message));
      }
      res.json(biz);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/admin/businesses/:id", adminMiddleware, async (req, res) => {
    try {
      const business = await storage.getBusinessById(req.params.id);
      if (!business) return res.status(404).json({ message: "Business not found" });
      await storage.deleteBusiness(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.put("/api/admin/businesses/:id/suspension", adminMiddleware, async (req, res) => {
    try {
      if (typeof req.body?.suspended !== "boolean") return res.status(400).json({ message: "suspended must be a boolean" });
      const business = await storage.getBusinessById(req.params.id);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const updated = await db.transaction(async tx => {
        const [updatedBusiness] = await tx.update(businesses).set({
          suspended: req.body.suspended,
          ...(req.body.suspended ? { featured: false } : {}),
        }).where(eq(businesses.id, business.id)).returning();
        if (!updatedBusiness || !req.body.suspended) return updatedBusiness;

        const [carItems, partItems, garageServiceItems, supportServiceItems] = await Promise.all([
          tx.select({ id: cars.id }).from(cars).where(eq(cars.dealerId, business.id)),
          tx.select({ id: spareParts.id }).from(spareParts).where(eq(spareParts.businessId, business.id)),
          tx.select({ id: garageServices.id }).from(garageServices).where(eq(garageServices.garageId, business.id)),
          tx.select({ id: supportServices.id }).from(supportServices).where(eq(supportServices.businessId, business.id)),
        ]);
        const requestItems = [
          { type: "business" as const, id: business.id },
          ...carItems.map(item => ({ type: "car" as const, id: item.id })),
          ...partItems.map(item => ({ type: "part" as const, id: item.id })),
          ...garageServiceItems.map(item => ({ type: "garage_service" as const, id: item.id })),
          ...supportServiceItems.map(item => ({ type: "support_service" as const, id: item.id })),
        ];
        for (const item of requestItems) {
          await tx.delete(featureRequests).where(and(
            eq(featureRequests.itemType, item.type),
            eq(featureRequests.itemId, item.id),
            eq(featureRequests.status, "pending"),
          ));
        }
        return updatedBusiness;
      });
      if (!updated) return res.status(404).json({ message: "Business not found" });
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.put("/api/admin/catalog/:type/:id/suspension", adminMiddleware, async (req, res) => {
    try {
      const { type, id } = req.params;
      if (typeof req.body?.suspended !== "boolean") return res.status(400).json({ message: "suspended must be a boolean" });
      if (!["car", "part", "garage_service", "support_service"].includes(type)) {
        return res.status(400).json({ message: "Unsupported catalog item type" });
      }
      const itemType = type as FeatureRequestItemType;
      const updates = { suspended: req.body.suspended, ...(req.body.suspended ? { featured: false } : {}) };
      const item = type === "car" ? await storage.updateCar(id, updates)
        : type === "part" ? await storage.updateSparePart(id, updates)
        : type === "garage_service" ? await storage.updateGarageService(id, updates)
        : await storage.updateSupportService(id, updates);
      if (!item) return res.status(404).json({ message: "Catalog item not found" });
      if (req.body.suspended) {
        await db.delete(featureRequests).where(and(eq(featureRequests.itemType, itemType), eq(featureRequests.itemId, id), eq(featureRequests.status, "pending")));
      }
      res.json(item);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.put("/api/admin/catalog/:type/:id", adminMiddleware, async (req, res) => {
    try {
      const { type, id } = req.params;
      const body = req.body || {};
      let item;
      if (type === "car") {
        const editable = new Set(["title", "brand", "model", "year", "price", "mileage", "fuelType", "transmission", "condition", "description", "images", "location"]);
        const fields = insertCarSchema.partial().parse(Object.fromEntries(Object.entries(body).filter(([key]) => editable.has(key))));
        if (Object.keys(fields).length === 0) return res.status(400).json({ message: "Provide at least one editable field" });
        item = await storage.updateCar(id, fields);
      } else if (type === "part") {
        const editable = new Set(["partName", "carBrand", "carModel", "year", "condition", "price", "description", "image"]);
        const fields = insertSparePartSchema.partial().parse(Object.fromEntries(Object.entries(body).filter(([key]) => editable.has(key))));
        if (Object.keys(fields).length === 0) return res.status(400).json({ message: "Provide at least one editable field" });
        item = await storage.updateSparePart(id, fields);
      } else if (type === "garage_service") {
        const editable = new Set(["name", "description", "price"]);
        const fields = insertGarageServiceSchema.partial().parse(Object.fromEntries(Object.entries(body).filter(([key]) => editable.has(key))));
        if (Object.keys(fields).length === 0) return res.status(400).json({ message: "Provide at least one editable field" });
        item = await storage.updateGarageService(id, fields);
      } else if (type === "support_service") {
        const editable = new Set(["name", "description", "startingPrice"]);
        const fields = insertSupportServiceSchema.partial().parse(Object.fromEntries(Object.entries(body).filter(([key]) => editable.has(key))));
        if (Object.keys(fields).length === 0) return res.status(400).json({ message: "Provide at least one editable field" });
        item = await storage.updateSupportService(id, fields);
      } else {
        return res.status(400).json({ message: "Unsupported catalog item type" });
      }
      if (!item) return res.status(404).json({ message: "Catalog item not found" });
      res.json(item);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/admin/catalog/:type/:id", adminMiddleware, async (req, res) => {
    try {
      const { type, id } = req.params;
      if (!["car", "part", "garage_service", "support_service"].includes(type)) {
        return res.status(400).json({ message: "Unsupported catalog item type" });
      }
      await db.delete(featureRequests).where(and(eq(featureRequests.itemType, type as FeatureRequestItemType), eq(featureRequests.itemId, id)));
      const galleryType = type === "part" ? "spare_part" : type;
      await db.delete(galleryImages).where(and(eq(galleryImages.entityType, galleryType), eq(galleryImages.entityId, id)));
      if (type === "car") await storage.deleteCar(id);
      else if (type === "part") await storage.deleteSparePart(id);
      else if (type === "garage_service") await storage.deleteGarageService(id);
      else await storage.deleteSupportService(id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/admin/reviews/:id", adminMiddleware, async (req, res) => {
    try {
      await storage.deleteReview(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/admin/revenue", adminMiddleware, async (req, res) => {
    try {
      const allBizList = await db.select().from(businesses);
      const premiumBizList = allBizList.filter(b => b.premium && b.premiumExpiresAt);
      const expiredPremiumList = allBizList.filter(b => !b.premium && b.premiumExpiresAt);
      const now = new Date();
      const activeSubs = premiumBizList.filter(b => new Date(b.premiumExpiresAt!) > now);
      const expiringSoon = activeSubs.filter(b => {
        const diff = new Date(b.premiumExpiresAt!).getTime() - now.getTime();
        return diff < 7 * 24 * 60 * 60 * 1000;
      });
      const allPremiumEver = [...premiumBizList, ...expiredPremiumList];
      const totalRevenue = allPremiumEver.length * PREMIUM_AMOUNT;
      const currentMrr = activeSubs.length * PREMIUM_AMOUNT;
      const result = {
        stats: {
          totalRevenue,
          currentMrr,
          activeSubscriptions: activeSubs.length,
          expiredSubscriptions: expiredPremiumList.length,
          expiringSoon: expiringSoon.length,
          premiumAmount: PREMIUM_AMOUNT,
          premiumDays: PREMIUM_DAYS,
        },
        activeSubscriptions: activeSubs.map(b => ({
          id: b.id,
          name: b.name,
          category: b.category,
          city: b.city,
          logo: b.logo,
          premiumExpiresAt: b.premiumExpiresAt,
          activatedAt: b.premiumExpiresAt
            ? new Date(new Date(b.premiumExpiresAt).getTime() - PREMIUM_DAYS * 24 * 60 * 60 * 1000)
            : null,
          amount: PREMIUM_AMOUNT,
          daysLeft: Math.max(0, Math.ceil((new Date(b.premiumExpiresAt!).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))),
        })),
        expiredSubscriptions: expiredPremiumList.map(b => ({
          id: b.id,
          name: b.name,
          category: b.category,
          city: b.city,
          logo: b.logo,
          premiumExpiresAt: b.premiumExpiresAt,
          amount: PREMIUM_AMOUNT,
        })),
      };
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/admin/reports", adminMiddleware, async (req, res) => {
    try {
      const reports = await storage.getAllReports();
      res.json(reports);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Reports (public)
  app.post("/api/report", async (req, res) => {
    try {
      const body = insertBusinessReportSchema.parse(req.body);
      const business = await storage.getBusinessById(body.businessId);
      if (!business || business.status !== "approved" || business.suspended) return res.status(404).json({ message: "Business not found" });
      const report = await storage.createReport(body);
      res.json(report);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Homepage product and service highlights
  app.get("/api/home/featured-offers", async (_req, res) => {
    try {
      const [sparePartsData, supportServicesData] = await Promise.all([
        storage.getFeaturedSpareParts(),
        storage.getFeaturedSupportServices(),
      ]);
      const supportService = supportServicesData.find((service) =>
        service.businessSubcategory === "vehicle_finance" || /loan|financ/i.test(service.name + " " + (service.description || ""))
      ) || supportServicesData[0] || null;
      res.json({ sparePart: sparePartsData[0] || null, supportService });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Spare Parts
  app.get("/api/spare-parts/:id", async (req, res) => {
    try {
      const part = await storage.getSparePartById(req.params.id);
      if (!part) return res.status(404).json({ message: "Spare part not found" });
      res.json(part);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/parts/:businessId", async (req, res) => {
    try {
      const parts = await storage.getSparePartsByBusinessId(req.params.businessId);
      res.json(parts);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/parts", ownerMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user.role !== "owner") return res.status(403).json({ message: "Only business owners can add spare-part listings" });
      const business = await storage.getBusinessByOwnerId(user.id);
      if (!business || business.category !== "spare_parts") return res.status(403).json({ message: "Only spare-parts businesses can add listings" });
      if (business.status !== "approved" || business.suspended) return res.status(403).json({ message: "Your business must be approved and active first" });
      const body = insertSparePartSchema.parse({
        ...pickFields(req.body, ["partName", "carBrand", "carModel", "year", "condition", "price", "description", "image"]),
        businessId: business.id,
        suspended: false,
      });
      const result = await createSparePartIfNotDuplicate(body);
      if (result.duplicate) {
        return res.status(409).json({ message: "An identical spare-part listing already exists", duplicate: true, existingId: result.record.id });
      }
      res.json(result.record);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.put("/api/parts/:id", ownerMiddleware, async (req, res) => {
    try {
      const actor = (req as any).user;
      if (!await actorCanManageListing(actor, "part", req.params.id)) return res.status(404).json({ message: "Spare part not found" });
      const fields = insertSparePartSchema.partial().parse(pickFields(req.body, ["partName", "carBrand", "carModel", "year", "condition", "price", "description", "image"]));
      if (Object.keys(fields).length === 0) return res.status(400).json({ message: "Provide at least one editable field" });
      const part = await storage.updateSparePart(req.params.id, fields);
      if (!part) return res.status(404).json({ message: "Spare part not found" });
      res.json(part);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/parts/:id", ownerMiddleware, async (req, res) => {
    try {
      const actor = (req as any).user;
      if (!await actorCanManageListing(actor, "part", req.params.id)) return res.status(404).json({ message: "Spare part not found" });
      await db.delete(featureRequests).where(and(eq(featureRequests.itemType, "part"), eq(featureRequests.itemId, req.params.id)));
      await db.delete(galleryImages).where(and(eq(galleryImages.entityType, "spare_part"), eq(galleryImages.entityId, req.params.id)));
      await storage.deleteSparePart(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Reviews
  app.get("/api/reviews/recent", async (req, res) => {
    try {
      const requested = Number.parseInt(String(req.query.limit ?? "6"), 10);
      const limit = Number.isFinite(requested) ? Math.max(1, Math.min(requested, 50)) : 6;
      const recentReviews = await db.select({
        id: reviews.id,
        businessId: reviews.businessId,
        name: reviews.name,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        businessName: businesses.name,
      }).from(reviews)
        .innerJoin(businesses, eq(reviews.businessId, businesses.id))
        .where(and(eq(businesses.status, "approved"), eq(businesses.suspended, false)))
        .orderBy(desc(reviews.createdAt))
        .limit(limit);
      res.json(recentReviews);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/reviews/:businessId", async (req, res) => {
    try {
      const business = await storage.getBusinessById(req.params.businessId);
      if (!business || business.status !== "approved" || business.suspended) return res.status(404).json({ message: "Business not found" });
      const revs = await storage.getReviewsByBusinessId(req.params.businessId);
      res.json(revs);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/reviews", async (req, res) => {
    try {
      const body = insertReviewSchema.parse(req.body);
      if (body.rating < 1 || body.rating > 5) return res.status(400).json({ message: "Rating must be 1-5" });
      const business = await storage.getBusinessById(body.businessId);
      if (!business || business.status !== "approved" || business.suspended) return res.status(404).json({ message: "Business not found" });
      const review = await storage.createReview(body);
      res.json(review);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Messages
  app.post("/api/messages", async (req, res) => {
    try {
      const body = insertMessageSchema.parse(req.body);
      const business = await storage.getBusinessById(body.businessId);
      if (!business || business.status !== "approved" || business.suspended) return res.status(404).json({ message: "Business not found" });
      const msg = await storage.createMessage(body);
      res.json(msg);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Cars
  app.get("/api/cars/featured", async (req, res) => {
    try {
      const carsData = await storage.getFeaturedCars();
      res.json(carsData);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/cars", async (req, res) => {
    try {
      const { q, brand, fuelType, transmission, minYear, maxYear, maxPrice, minPrice, location, dealerId, condition } = req.query as Record<string, string>;
      const carsData = await storage.getCars({
        q, brand, location, dealerId,
        condition: condition || undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        minYear: minYear ? Number(minYear) : undefined,
        maxYear: maxYear ? Number(maxYear) : undefined,
      });
      res.json(carsData);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/cars/:id", async (req, res) => {
    try {
      const car = await storage.getCarById(req.params.id);
      if (!car) return res.status(404).json({ message: "Car not found" });
      res.json(car);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/cars", ownerMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;
      const biz = await storage.getBusinessByOwnerId(user.id);
      if (!biz || biz.category !== "car_dealer") return res.status(403).json({ message: "Only car dealers can add car listings" });
      if (biz.status !== "approved" || biz.suspended) return res.status(403).json({ message: "Your business must be approved and active first" });
      if (user.role !== "owner") return res.status(403).json({ message: "Only business owners can add car listings" });
      const body = insertCarSchema.parse({
        ...pickFields(req.body, ["title", "brand", "model", "year", "price", "mileage", "fuelType", "transmission", "condition", "description", "images", "location"]),
        dealerId: biz.id,
        suspended: false,
      });
      const result = await createCarIfNotDuplicate(body);
      if (result.duplicate) {
        return res.status(409).json({ message: "An identical car listing already exists", duplicate: true, existingId: result.record.id });
      }
      res.json(result.record);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.put("/api/cars/:id", ownerMiddleware, async (req, res) => {
    try {
      const actor = (req as any).user;
      if (!await actorCanManageListing(actor, "car", req.params.id)) return res.status(404).json({ message: "Car not found" });
      const data = insertCarSchema.partial().parse(pickFields(req.body, ["title", "brand", "model", "year", "price", "mileage", "fuelType", "transmission", "condition", "description", "images", "location"]));
      if (Object.keys(data).length === 0) return res.status(400).json({ message: "Provide at least one editable field" });
      const car = await storage.updateCar(req.params.id, data);
      if (!car) return res.status(404).json({ message: "Car not found" });
      res.json(car);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/cars/:id", ownerMiddleware, async (req, res) => {
    try {
      const actor = (req as any).user;
      if (!await actorCanManageListing(actor, "car", req.params.id)) return res.status(404).json({ message: "Car not found" });
      await db.delete(featureRequests).where(and(eq(featureRequests.itemType, "car"), eq(featureRequests.itemId, req.params.id)));
      await db.delete(galleryImages).where(and(eq(galleryImages.entityType, "car"), eq(galleryImages.entityId, req.params.id)));
      await storage.deleteCar(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Garage Services
  app.get("/api/services/featured", async (_req, res) => {
    try {
      const services = await storage.getFeaturedGarageServices();
      res.json(services);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/services/popular", async (req, res) => {
    try {
      const svcs = await storage.getPopularGarageServices();
      res.json(svcs);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/services", async (req, res) => {
    try {
      const { q, location, garageId } = req.query as Record<string, string>;
      const svcs = await storage.getGarageServices({ q, location, garageId });
      res.json(svcs);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/services/:id", async (req, res) => {
    try {
      const service = await storage.getGarageServiceById(req.params.id);
      if (!service) return res.status(404).json({ message: "Service not found" });
      res.json(service);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/services", ownerMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user.role !== "owner") return res.status(403).json({ message: "Only business owners can add garage services" });
      const biz = await storage.getBusinessByOwnerId(user.id);
      if (!biz || biz.category !== "garage") return res.status(403).json({ message: "Only garages can add service listings" });
      if (biz.status !== "approved" || biz.suspended) return res.status(403).json({ message: "Your business must be approved and active first" });
      const body = insertGarageServiceSchema.parse({
        ...pickFields(req.body, ["name", "description", "price"]),
        garageId: biz.id,
        suspended: false,
        popular: false,
      });
      const svc = await storage.createGarageService(body);
      res.json(svc);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.put("/api/services/:id", ownerMiddleware, async (req, res) => {
    try {
      const actor = (req as any).user;
      if (!await actorCanManageListing(actor, "garage_service", req.params.id)) return res.status(404).json({ message: "Service not found" });
      const data = insertGarageServiceSchema.partial().parse(pickFields(req.body, ["name", "description", "price"]));
      if (Object.keys(data).length === 0) return res.status(400).json({ message: "Provide at least one editable field" });
      const svc = await storage.updateGarageService(req.params.id, data);
      if (!svc) return res.status(404).json({ message: "Service not found" });
      res.json(svc);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/services/:id", ownerMiddleware, async (req, res) => {
    try {
      const actor = (req as any).user;
      if (!await actorCanManageListing(actor, "garage_service", req.params.id)) return res.status(404).json({ message: "Service not found" });
      await db.delete(featureRequests).where(and(eq(featureRequests.itemType, "garage_service"), eq(featureRequests.itemId, req.params.id)));
      await db.delete(galleryImages).where(and(eq(galleryImages.entityType, "garage_service"), eq(galleryImages.entityId, req.params.id)));
      await storage.deleteGarageService(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Support Services (insurance, car wash, other automotive)
  app.get("/api/support-service/:id", async (req, res) => {
    try {
      const service = await storage.getSupportServiceById(req.params.id);
      if (!service) return res.status(404).json({ message: "Support service not found" });
      res.json(service);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/support-services/:businessId", async (req, res) => {
    try {
      const svcs = await storage.getSupportServicesByBusinessId(req.params.businessId);
      res.json(svcs);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/support-services", ownerMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user.role !== "owner") return res.status(403).json({ message: "Only business owners can add support services" });
      const biz = await storage.getBusinessByOwnerId(user.id);
      const supportCategories = ["insurance", "car_wash", "other"];
      if (!biz || !supportCategories.includes(biz.category)) return res.status(403).json({ message: "Only automotive support businesses can add support services" });
      if (biz.status !== "approved" || biz.suspended) return res.status(403).json({ message: "Your business must be approved and active first" });
      const body = insertSupportServiceSchema.parse({
        ...pickFields(req.body, ["name", "description", "startingPrice"]),
        businessId: biz.id,
        suspended: false,
      });
      const svc = await storage.createSupportService(body);
      res.json(svc);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.put("/api/support-services/:id", ownerMiddleware, async (req, res) => {
    try {
      const actor = (req as any).user;
      if (!await actorCanManageListing(actor, "support_service", req.params.id)) return res.status(404).json({ message: "Support service not found" });
      const data = insertSupportServiceSchema.partial().parse(pickFields(req.body, ["name", "description", "startingPrice"]));
      if (Object.keys(data).length === 0) return res.status(400).json({ message: "Provide at least one editable field" });
      const svc = await storage.updateSupportService(req.params.id, data);
      if (!svc) return res.status(404).json({ message: "Support service not found" });
      res.json(svc);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/support-services/:id", ownerMiddleware, async (req, res) => {
    try {
      const actor = (req as any).user;
      if (!await actorCanManageListing(actor, "support_service", req.params.id)) return res.status(404).json({ message: "Support service not found" });
      await db.delete(featureRequests).where(and(eq(featureRequests.itemType, "support_service"), eq(featureRequests.itemId, req.params.id)));
      await db.delete(galleryImages).where(and(eq(galleryImages.entityType, "support_service"), eq(galleryImages.entityId, req.params.id)));
      await storage.deleteSupportService(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // CSV Import routes
  const csvUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) cb(null, true);
      else cb(new Error("Only CSV files are allowed"));
    },
  });

  function parseCSV(raw: string): Record<string, string>[] {
    const records: string[][] = [];
    let values: string[] = [];
    let field = "";
    let inQuotes = false;

    for (let index = 0; index < raw.length; index++) {
      const char = raw[index];
      if (char === '"') {
        if (inQuotes && raw[index + 1] === '"') {
          field += '"';
          index++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        values.push(field.trim());
        field = "";
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        values.push(field.trim());
        if (values.some(value => value !== "")) records.push(values);
        values = [];
        field = "";
        if (char === "\r" && raw[index + 1] === "\n") index++;
      } else {
        field += char;
      }
    }

    if (inQuotes) throw new Error("CSV contains an unterminated quoted field");
    values.push(field.trim());
    if (values.some(value => value !== "")) records.push(values);
    if (records.length < 2) return [];

    const headers = records[0].map((header, index) =>
      (index === 0 ? header.replace(/^\uFEFF/, "") : header).trim()
    );
    return records.slice(1).map(values => {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => { row[header] = values[index] ?? ""; });
      return row;
    });
  }

  const TEMPLATES: Record<string, string> = {
    cars: "title,brand,model,year,price,mileage,fuelType,transmission,condition,location,description\nToyota Prado TX 2020,Toyota,Prado,2020,6500000,35000,diesel,automatic,used,Nairobi,Well maintained Prado TX in excellent condition",
    parts: "partName,carBrand,carModel,year,condition,price,description\nBrake Pads Front,Toyota,Corolla,2019,new,KSh 2500,Genuine Toyota brake pads",
    services: "name,description,price\nOil Change & Filter Service,Full synthetic oil change with filter replacement. Includes 20-point inspection.,KSh 2500",
    "support-services": "name,description,startingPrice\nComprehensive Cover,Full vehicle comprehensive insurance with third-party liability,KSh 15000/year",
  };

  async function getAdminImportBusiness(req: any, res: any, allowedCategories: string[]) {
    const businessId = typeof req.body?.businessId === "string" ? req.body.businessId.trim() : "";
    if (!businessId) {
      res.status(400).json({ message: "Select an approved business before importing listings" });
      return null;
    }
    const [biz] = await db.select({
      id: businesses.id,
      category: businesses.category,
      status: businesses.status,
      suspended: businesses.suspended,
      city: businesses.city,
    }).from(businesses).where(eq(businesses.id, businessId)).limit(1);
    if (!biz) {
      res.status(404).json({ message: "Selected business was not found" });
      return null;
    }
    if (!allowedCategories.includes(biz.category)) {
      res.status(400).json({ message: "Selected business does not match the chosen data type" });
      return null;
    }
    if (biz.status !== "approved") {
      res.status(400).json({ message: "Listings can only be imported to an approved business" });
      return null;
    }
    if (biz.suspended) {
      res.status(400).json({ message: "Listings cannot be imported to a suspended business" });
      return null;
    }
    return biz;
  }

  function validateAdminImportHeaders(req: any, res: any, rows: Record<string, string>[], requiredHeaders: string[]) {
    if (req.user?.role !== "admin") return true;
    const headers = new Set(Object.keys(rows[0] || {}));
    const missing = requiredHeaders.filter(header => !headers.has(header));
    if (missing.length > 0) {
      res.status(400).json({ message: "CSV does not match the selected data type. Missing columns: " + missing.join(", ") });
      return false;
    }
    return true;
  }

  app.get("/api/import/template/:type", authMiddleware, (req, res) => {
    const type = req.params.type;
    if (!TEMPLATES[type]) return res.status(404).json({ message: "Unknown template type" });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${type}-template.csv"`);
    res.send(TEMPLATES[type]);
  });

  app.post("/api/import/cars", ownerMiddleware, csvUpload.single("file"), async (req: any, res) => {
    try {
      const biz = req.user?.role === "admin"
        ? await getAdminImportBusiness(req, res, ["car_dealer"])
        : await storage.getBusinessByOwnerId(req.user.id);
      if (req.user?.role === "admin" && !biz) return;
      if (!biz || biz.category !== "car_dealer") return res.status(403).json({ message: "Only car dealers can import car listings" });
      if (biz.status !== "approved" || biz.suspended) return res.status(403).json({ message: "Your business must be approved and active first" });
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const rows = parseCSV(req.file.buffer.toString("utf-8"));
      if (rows.length === 0) return res.status(400).json({ message: "CSV file is empty or has no data rows" });
      if (!validateAdminImportHeaders(req, res, rows, ["title", "brand", "model", "year", "price", "location"])) return;
      const results = { imported: 0, failed: 0, skipped: 0, errors: [] as string[] };
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const body = insertCarSchema.parse({
            dealerId: biz.id,
            title: row.title || "",
            brand: row.brand || "",
            model: row.model || "",
            year: row.year ? parseInt(row.year) : new Date().getFullYear(),
            price: row.price ? String(parseFloat(row.price.replace(/[^0-9.]/g, ""))) : "0",
            mileage: row.mileage ? parseInt(row.mileage) : null,
            fuelType: row.fuelType || "petrol",
            transmission: row.transmission || "automatic",
            condition: row.condition || "used",
            location: row.location || biz.city || "",
            description: row.description || null,
            images: [],
            featured: false,
          });
          const created = await createCarIfNotDuplicate(body);
          if (created.duplicate) {
            results.skipped++;
            results.errors.push(`Row ${i + 2}: identical car listing already exists; skipped`);
            continue;
          }
          results.imported++;
        } catch (e: any) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: ${e.message}`);
        }
      }
      res.json(results);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/import/parts", ownerMiddleware, csvUpload.single("file"), async (req: any, res) => {
    try {
      const biz = req.user?.role === "admin"
        ? await getAdminImportBusiness(req, res, ["spare_parts"])
        : await storage.getBusinessByOwnerId(req.user.id);
      if (req.user?.role === "admin" && !biz) return;
      if (!biz || biz.category !== "spare_parts") return res.status(403).json({ message: "Only spare-parts businesses can import listings" });
      if (biz.status !== "approved" || biz.suspended) return res.status(403).json({ message: "Your business must be approved and active first" });
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const rows = parseCSV(req.file.buffer.toString("utf-8"));
      if (rows.length === 0) return res.status(400).json({ message: "CSV file is empty or has no data rows" });
      if (!validateAdminImportHeaders(req, res, rows, ["partName", "carBrand", "carModel"])) return;
      const results = { imported: 0, failed: 0, skipped: 0, errors: [] as string[] };
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const body = insertSparePartSchema.parse({
            businessId: biz.id,
            partName: row.partName || "",
            carBrand: row.carBrand || "",
            carModel: row.carModel || "",
            year: row.year || null,
            condition: row.condition || "new",
            price: row.price || null,
            description: row.description || null,
            image: row.image || null,
          });
          const created = await createSparePartIfNotDuplicate(body);
          if (created.duplicate) {
            results.skipped++;
            results.errors.push(`Row ${i + 2}: identical spare-part listing already exists; skipped`);
            continue;
          }
          results.imported++;
        } catch (e: any) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: ${e.message}`);
        }
      }
      res.json(results);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/import/services", ownerMiddleware, csvUpload.single("file"), async (req: any, res) => {
    try {
      const biz = req.user?.role === "admin"
        ? await getAdminImportBusiness(req, res, ["garage"])
        : await storage.getBusinessByOwnerId(req.user.id);
      if (req.user?.role === "admin" && !biz) return;
      if (!biz || biz.category !== "garage") return res.status(403).json({ message: "Only garages can import services" });
      if (biz.status !== "approved" || biz.suspended) return res.status(403).json({ message: "Your business must be approved and active first" });
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const rows = parseCSV(req.file.buffer.toString("utf-8"));
      if (rows.length === 0) return res.status(400).json({ message: "CSV file is empty or has no data rows" });
      if (!validateAdminImportHeaders(req, res, rows, ["name"])) return;
      // Build set of existing service names for duplicate detection
      const existingServices = await storage.getGarageServicesByGarageId(biz.id);
      const knownServiceNames = new Set(existingServices.map(s => s.name.trim().toLowerCase()));
      const seenInFile = new Set<string>();
      const results = { imported: 0, failed: 0, skipped: 0, errors: [] as string[] };
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const normalizedName = (row.name || "").trim().toLowerCase();
          if (!normalizedName) {
            results.failed++;
            results.errors.push(`Row ${i + 2}: service name is required`);
            continue;
          }
          if (seenInFile.has(normalizedName)) {
            results.skipped++;
            results.errors.push(`Row ${i + 2}: duplicate service name in this file`);
            continue;
          }
          if (knownServiceNames.has(normalizedName)) {
            results.skipped++;
            results.errors.push(`Row ${i + 2}: service "${row.name}" already exists`);
            continue;
          }
          const body = insertGarageServiceSchema.parse({
            garageId: biz.id,
            name: row.name || "",
            description: row.description || null,
            price: row.price || null,
            popular: false,
          });
          await storage.createGarageService(body);
          knownServiceNames.add(normalizedName);
          seenInFile.add(normalizedName);
          results.imported++;
        } catch (e: any) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: ${e.message}`);
        }
      }
      res.json(results);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/import/support-services", ownerMiddleware, csvUpload.single("file"), async (req: any, res) => {
    try {
      const supportCategories = ["insurance", "car_wash", "other"];
      const biz = req.user?.role === "admin"
        ? await getAdminImportBusiness(req, res, supportCategories)
        : await storage.getBusinessByOwnerId(req.user.id);
      if (req.user?.role === "admin" && !biz) return;
      if (!biz || !supportCategories.includes(biz.category)) return res.status(403).json({ message: "Only automotive support businesses can import services" });
      if (biz.status !== "approved" || biz.suspended) return res.status(403).json({ message: "Your business must be approved and active first" });
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const rows = parseCSV(req.file.buffer.toString("utf-8"));
      if (rows.length === 0) return res.status(400).json({ message: "CSV file is empty or has no data rows" });
      if (!validateAdminImportHeaders(req, res, rows, ["name"])) return;
      // Build set of existing service names for duplicate detection
      const existingServices = await storage.getSupportServicesByBusinessId(biz.id);
      const knownServiceNames = new Set(existingServices.map(s => s.name.trim().toLowerCase()));
      const seenInFile = new Set<string>();
      const results = { imported: 0, failed: 0, skipped: 0, errors: [] as string[] };
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const normalizedName = (row.name || "").trim().toLowerCase();
          if (!normalizedName) {
            results.failed++;
            results.errors.push(`Row ${i + 2}: service name is required`);
            continue;
          }
          if (seenInFile.has(normalizedName)) {
            results.skipped++;
            results.errors.push(`Row ${i + 2}: duplicate service name in this file`);
            continue;
          }
          if (knownServiceNames.has(normalizedName)) {
            results.skipped++;
            results.errors.push(`Row ${i + 2}: service "${row.name}" already exists`);
            continue;
          }
          const body = insertSupportServiceSchema.parse({
            businessId: biz.id,
            name: row.name || "",
            description: row.description || null,
            startingPrice: row.startingPrice || row.price || null,
          });
          await storage.createSupportService(body);
          knownServiceNames.add(normalizedName);
          seenInFile.add(normalizedName);
          results.imported++;
        } catch (e: any) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: ${e.message}`);
        }
      }
      res.json(results);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // âââ Admin Export âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

  function toCSV(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
    const escape = (v: any) => {
      if (v == null) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [headers, ...rows].map(r => r.map(escape).join(",")).join("\n");
  }

  app.get("/api/admin/export/businesses", adminMiddleware, async (req: any, res) => {
    try {
      const status = (req.query.status as string) || "all";
      const allBiz = await storage.getAllBusinesses();
      const filtered = status === "all" ? allBiz : allBiz.filter(b => b.status === status);
      const headers = ["id","name","category","status","city","address","phone","whatsapp","description","premium","premiumExpiresAt","createdAt"];
      const rows = filtered.map(b => [b.id, b.name, b.category, b.status, b.city, b.address, b.phone, b.whatsapp, b.description, b.premium, b.premiumExpiresAt?.toISOString(), b.createdAt?.toISOString()]);
      const csv = toCSV(headers, rows);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="businesses-${status}-${Date.now()}.csv"`);
      res.send(csv);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/admin/export/users", adminMiddleware, async (req: any, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const headers = ["id","name","email","role","createdAt"];
      const rows = allUsers.map(u => [u.id, u.name, u.email, u.role, u.createdAt?.toISOString()]);
      const csv = toCSV(headers, rows);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="users-${Date.now()}.csv"`);
      res.send(csv);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/admin/export/reviews", adminMiddleware, async (req: any, res) => {
    try {
      const allReviews = await storage.getAllReviews();
      const headers = ["id","businessId","businessName","reviewerName","rating","comment","createdAt"];
      const rows = allReviews.map((r: any) => [r.id, r.businessId, r.businessName ?? "", r.name, r.rating, r.comment, r.createdAt]);
      const csv = toCSV(headers, rows);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="reviews-${Date.now()}.csv"`);
      res.send(csv);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // âââ Admin Import âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

  function normalizeKeBusinessPhone(raw: string): string {
    let d = raw.replace(/\D/g, "");
    if (d.startsWith("0") && d.length >= 9) d = `254${d.slice(1)}`;
    if (!d.startsWith("254") && d.length === 9) d = `254${d}`;
    return d;
  }

  app.get("/api/admin/import/businesses", adminMiddleware, async (_req, res) => {
    try {
      const targets = await db.select({
        id: businesses.id,
        name: businesses.name,
        category: businesses.category,
        city: businesses.city,
      }).from(businesses).where(eq(businesses.status, "approved")).orderBy(businesses.name);
      res.json(targets);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/admin/import/businesses", adminMiddleware, csvUpload.single("file"), async (req: any, res) => {
    try {
      const requestedCategory = typeof req.body?.category === "string" ? req.body.category.trim() : "";
      const requestedSubcategory = typeof req.body?.subcategory === "string" ? req.body.subcategory.trim() : "";
      const businessCategoryMap: Record<string, "car_dealer" | "spare_parts" | "garage" | "other"> = {
        car_dealer: "car_dealer",
        spare_parts: "spare_parts",
        garage: "garage",
        automotive_support: "other",
      };
      const category = businessCategoryMap[requestedCategory];
      if (!category) return res.status(400).json({ message: "Select a valid business category before importing" });
      if (requestedCategory === "automotive_support" && !AUTOMOTIVE_SUPPORT_SUBCATEGORIES.some(item => item.value === requestedSubcategory)) {
        return res.status(400).json({ message: "Select a valid Automotive Support service type before importing" });
      }
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const rows = parseCSV(req.file.buffer.toString("utf-8"));
      if (rows.length === 0) return res.status(400).json({ message: "CSV file is empty or has no data rows" });
      if (!Object.prototype.hasOwnProperty.call(rows[0], "name")) {
        return res.status(400).json({ message: "CSV must include a 'name' column. Download the Businesses template for the required format." });
      }
      const existingBizRecords = await db.select({ name: businesses.name }).from(businesses);
      const knownNormalizedNames = new Set(
        existingBizRecords.map((r) => (r.name || "").trim().replace(/\s+/g, " ").toLowerCase()).filter(Boolean)
      );
      const results = { imported: 0, failed: 0, skipped: 0, errors: [] as string[], created: [] as { id: string; name: string; city: string }[] };
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const businessName = (row.name || "").trim();
          const normalizedName = businessName.replace(/\s+/g, " ").toLowerCase();
          if (!normalizedName) {
            results.failed++;
            results.errors.push(`Row ${i + 2}: business name is required`);
            continue;
          }
          if (knownNormalizedNames.has(normalizedName)) {
            results.skipped++;
            continue;
          }
          const norm = normalizeKeBusinessPhone(row.phone || "");
          if (norm.length < 9) {
            results.failed++;
            results.errors.push(`Row ${i + 2}: phone missing or too short`);
            continue;
          }
          const body = {
            ...insertBusinessSchema.parse({
              ownerId: req.user.id,
              name: businessName,
              category,
              phone: row.phone || "",
              whatsapp: (row.whatsapp ?? "").trim(),
              address: (row.address ?? "").trim(),
              city: (row.city ?? "").trim(),
              description: (row.description ?? "").trim(),
              subcategory: requestedCategory === "automotive_support"
                ? requestedSubcategory
                : (row.subcategory ?? "").trim() || null,
              carBrands: row.carBrands ? row.carBrands.split("|").map((brand: string) => brand.trim()).filter(Boolean) : null,
              website: (row.website ?? "").trim() || null,
              logo: (row.logo ?? "").trim() || null,
              banner: (row.banner ?? "").trim() || null,
              latitude: (row.latitude ?? "").trim() || null,
              longitude: (row.longitude ?? "").trim() || null,
              premium: false,
              featured: false,
            }),
            status: "approved" as const,
            featured: false,
          };
          const created = await storage.createBusiness(body);
          knownNormalizedNames.add(normalizedName);
          results.imported++;
          results.created.push({ id: created.id, name: created.name, city: created.city });
        } catch (e: any) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: ${e.message}`);
        }
      }
      res.json(results);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Brand page route
  app.get("/api/businesses/by-brand/:brand", async (req, res) => {
    try {
      const brand = decodeURIComponent(req.params.brand);
      const result = await storage.getBusinessesByBrand(brand);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Gallery routes
  app.get("/api/gallery/:entityType/:entityId", async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const images = await storage.getGalleryImages(entityType, entityId);
      res.json(images);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/gallery/:entityType/:entityId", authMiddleware, handleGalleryUpload, async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No image file uploaded" });
      const { entityType, entityId } = req.params;
      if (!["business", "car", "spare_part", "garage_service", "support_service"].includes(entityType)) {
        return res.status(400).json({ message: "Unsupported gallery item type" });
      }
      if (!await actorCanManageListing(req.user, entityType, entityId)) {
        return res.status(404).json({ message: "Gallery item not found" });
      }
      const url = await saveUploadedFile(req.file, "gallery", "gallery");
      const caption = req.body.caption || null;
      const image = await storage.addGalleryImage({ entityType, entityId, url, caption });
      res.json(image);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/gallery/:id", authMiddleware, async (req: any, res) => {
    try {
      const image = await storage.getGalleryImageById(req.params.id);
      if (!image) return res.status(404).json({ message: "Image not found" });
      if (!await actorCanManageGalleryImage(req.user, image)) return res.status(404).json({ message: "Image not found" });
      await storage.deleteGalleryImage(req.params.id);
      const storageKey = image.url.startsWith("/uploads/") ? image.url.slice("/uploads/".length) : null;
      if (storageKey) await deletePersistentUpload(storageKey);
      const filePath = path.resolve(process.cwd(), image.url.replace(/^\//, ""));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  return httpServer;
}
