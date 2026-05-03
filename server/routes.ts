import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";
import { insertUserSchema, insertBusinessSchema, insertSparePartSchema, insertReviewSchema, insertMessageSchema, insertCarSchema, insertGarageServiceSchema, insertSupportServiceSchema, insertBusinessReportSchema, businesses } from "@shared/schema";
import { initiateSTKPush, PREMIUM_AMOUNT, PREMIUM_DAYS } from "./mpesa";
import { db } from "./storage";
import { sendVerificationEmail, sendAdminNotificationEmail, sendApprovalEmail, sendRejectionEmail, sendRegistrationConfirmationEmail, ADMIN_EMAIL, isMailConfigured } from "./mailer";

// Ensure uploads directories exist
const logosDir = path.resolve(process.cwd(), "uploads/logos");
const partsDir = path.resolve(process.cwd(), "uploads/parts");
const galleryDir = path.resolve(process.cwd(), "uploads/gallery");
if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true });
if (!fs.existsSync(partsDir)) fs.mkdirSync(partsDir, { recursive: true });
if (!fs.existsSync(galleryDir)) fs.mkdirSync(galleryDir, { recursive: true });

function makeUpload(dest: string, prefix: string) {
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, dest),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith("image/")) cb(null, true);
      else cb(new Error("Only image files are allowed"));
    },
  });
}

const logoUpload = makeUpload(logosDir, "logo");
const partImageUpload = makeUpload(partsDir, "part");
const galleryUpload = makeUpload(galleryDir, "gallery");

const JWT_SECRET = process.env.SESSION_SECRET || "autodirectory-secret-key";

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

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // Serve uploaded logos as static files
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

  // Logo upload endpoint
  app.post("/api/upload/logo", authMiddleware, logoUpload.single("logo"), (req: any, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const url = `/uploads/logos/${req.file.filename}`;
    res.json({ url });
  });

  // Spare part image upload endpoint
  app.post("/api/upload/part-image", authMiddleware, partImageUpload.single("image"), (req: any, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const url = `/uploads/parts/${req.file.filename}`;
    res.json({ url });
  });

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const body = insertUserSchema.parse(req.body);
      const existing = await storage.getUserByEmail(body.email);
      if (existing) return res.status(400).json({ message: "Email already registered" });
      const hashed = await bcrypt.hash(body.password, 10);
      const user = await storage.createUser({ ...body, password: hashed });
      const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
      res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
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
    res.json({
      amount: PREMIUM_AMOUNT,
      days: PREMIUM_DAYS,
      configured: !!(process.env.MPESA_CONSUMER_KEY && process.env.MPESA_SHORTCODE && process.env.MPESA_CALLBACK_URL),
    });
  });

  app.post("/api/mpesa/initiate", ownerMiddleware, async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) return res.status(400).json({ message: "Phone number required" });

      const user = (req as any).user;
      const biz = await storage.getBusinessByOwnerId(user.id);
      if (!biz) return res.status(404).json({ message: "No business found" });
      if (biz.status !== "approved") return res.status(403).json({ message: "Business must be approved first" });

      const result = await initiateSTKPush(phone, biz.id, biz.name);
      res.json({ success: true, message: "Payment request sent to your phone. Enter your M-Pesa PIN to confirm.", checkoutRequestId: result.CheckoutRequestID });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to initiate payment" });
    }
  });

  app.post("/api/mpesa/callback", async (req, res) => {
    try {
      const body = req.body?.Body?.stkCallback;
      if (!body) return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });

      const resultCode = body.ResultCode;
      const accountReference = body.CallbackMetadata?.Item?.find((i: any) => i.Name === "AccountReference")?.Value || "";

      if (resultCode === 0 && accountReference) {
        const businessId = accountReference;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + PREMIUM_DAYS);
        await storage.updateBusiness(businessId, { premium: true, premiumExpiresAt: expiresAt });
      }

      res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
    } catch (e: any) {
      res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
    }
  });

  app.post("/api/mpesa/manual-activate", adminMiddleware, async (req, res) => {
    try {
      const { businessId, days } = req.body;
      if (!businessId) return res.status(400).json({ message: "businessId required" });
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (days || PREMIUM_DAYS));
      const biz = await storage.updateBusiness(businessId, { premium: true, premiumExpiresAt: expiresAt });
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
      if (!business) return res.status(404).json({ message: "Business not found" });
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
      const body = insertBusinessSchema.parse({ ...req.body, ownerId: user.id });
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
      const { id, ownerId, createdAt, status, ...allowedFields } = req.body;
      const updated = await storage.updateBusiness(biz.id, allowedFields);
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
      if (!business) return res.json({ business: null, messages: [], reviews: [], spareParts: [], cars: [], garageServices: [], supportServices: [] });
      const isSupport = ["insurance", "car_wash", "other"].includes(business.category);
      const [msgs, revs, parts, carsData, servicesData, supportSvcs] = await Promise.all([
        storage.getMessagesByBusinessId(business.id),
        storage.getReviewsByBusinessId(business.id),
        storage.getSparePartsByBusinessId(business.id),
        business.category === "car_dealer" ? storage.getCarsByDealerId(business.id) : Promise.resolve([]),
        business.category === "garage" ? storage.getGarageServicesByGarageId(business.id) : Promise.resolve([]),
        isSupport ? storage.getSupportServicesByBusinessId(business.id) : Promise.resolve([]),
      ]);
      res.json({ business, messages: msgs, reviews: revs, spareParts: parts, cars: carsData, garageServices: servicesData, supportServices: supportSvcs });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Admin routes
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

  app.put("/api/admin/businesses/:id/approve", adminMiddleware, async (req, res) => {
    try {
      const biz = await storage.updateBusiness(req.params.id, { status: "approved" });
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
      const biz = await storage.updateBusiness(req.params.id, { status: "rejected" });
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
      await storage.deleteBusiness(req.params.id);
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
      const report = await storage.createReport(body);
      res.json(report);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Spare Parts
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
      const body = insertSparePartSchema.parse(req.body);
      const part = await storage.createSparePart(body);
      res.json(part);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.put("/api/parts/:id", ownerMiddleware, async (req, res) => {
    try {
      const part = await storage.updateSparePart(req.params.id, req.body);
      res.json(part);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/parts/:id", ownerMiddleware, async (req, res) => {
    try {
      await storage.deleteSparePart(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Reviews
  app.get("/api/reviews/recent", async (req, res) => {
    try {
      const limit = parseInt((req.query.limit as string) || "6", 10);
      const all = await storage.getAllReviews();
      res.json(all.slice(0, limit));
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/reviews/:businessId", async (req, res) => {
    try {
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
      if (biz.status !== "approved") return res.status(403).json({ message: "Your business must be approved first" });
      const body = insertCarSchema.parse({ ...req.body, dealerId: biz.id });
      const car = await storage.createCar(body);
      res.json(car);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.put("/api/cars/:id", ownerMiddleware, async (req, res) => {
    try {
      const { id, dealerId, createdAt, ...data } = req.body;
      const car = await storage.updateCar(req.params.id, data);
      res.json(car);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/cars/:id", ownerMiddleware, async (req, res) => {
    try {
      await storage.deleteCar(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Garage Services
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

  app.post("/api/services", ownerMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;
      const biz = await storage.getBusinessByOwnerId(user.id);
      if (!biz || biz.category !== "garage") return res.status(403).json({ message: "Only garages can add service listings" });
      if (biz.status !== "approved") return res.status(403).json({ message: "Your business must be approved first" });
      const body = insertGarageServiceSchema.parse({ ...req.body, garageId: biz.id });
      const svc = await storage.createGarageService(body);
      res.json(svc);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.put("/api/services/:id", ownerMiddleware, async (req, res) => {
    try {
      const { id, garageId, createdAt, ...data } = req.body;
      const svc = await storage.updateGarageService(req.params.id, data);
      res.json(svc);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/services/:id", ownerMiddleware, async (req, res) => {
    try {
      await storage.deleteGarageService(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Support Services (insurance, car wash, other automotive)
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
      const biz = await storage.getBusinessByOwnerId(user.id);
      const supportCategories = ["insurance", "car_wash", "other"];
      if (!biz || !supportCategories.includes(biz.category)) return res.status(403).json({ message: "Only automotive support businesses can add support services" });
      if (biz.status !== "approved") return res.status(403).json({ message: "Your business must be approved first" });
      const body = insertSupportServiceSchema.parse({ ...req.body, businessId: biz.id });
      const svc = await storage.createSupportService(body);
      res.json(svc);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.put("/api/support-services/:id", ownerMiddleware, async (req, res) => {
    try {
      const { id, businessId, createdAt, ...data } = req.body;
      const svc = await storage.updateSupportService(req.params.id, data);
      res.json(svc);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/support-services/:id", ownerMiddleware, async (req, res) => {
    try {
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
    const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n");
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    return lines.slice(1).filter(l => l.trim()).map(line => {
      const values: string[] = [];
      let cur = "", inQuotes = false;
      for (const ch of line) {
        if (ch === '"') { inQuotes = !inQuotes; }
        else if (ch === "," && !inQuotes) { values.push(cur.trim()); cur = ""; }
        else { cur += ch; }
      }
      values.push(cur.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = (values[i] ?? "").replace(/^"|"$/g, ""); });
      return row;
    });
  }

  const TEMPLATES: Record<string, string> = {
    cars: "title,brand,model,year,price,mileage,fuelType,transmission,condition,location,description\nToyota Prado TX 2020,Toyota,Prado,2020,6500000,35000,diesel,automatic,used,Nairobi,Well maintained Prado TX in excellent condition",
    parts: "partName,carBrand,carModel,year,condition,price,description\nBrake Pads Front,Toyota,Corolla,2019,new,KSh 2500,Genuine Toyota brake pads",
    services: "name,description,price\nOil Change & Filter Service,Full synthetic oil change with filter replacement. Includes 20-point inspection.,KSh 2500",
    "support-services": "name,description,price\nComprehensive Cover,Full vehicle comprehensive insurance with third-party liability,KSh 15000/year",
  };

  app.get("/api/import/template/:type", authMiddleware, (req, res) => {
    const type = req.params.type;
    if (!TEMPLATES[type]) return res.status(404).json({ message: "Unknown template type" });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${type}-template.csv"`);
    res.send(TEMPLATES[type]);
  });

  app.post("/api/import/cars", ownerMiddleware, csvUpload.single("file"), async (req: any, res) => {
    try {
      const biz = await storage.getBusinessByOwnerId(req.user.id);
      if (!biz || biz.category !== "car_dealer") return res.status(403).json({ message: "Only car dealers can import car listings" });
      if (biz.status !== "approved") return res.status(403).json({ message: "Your business must be approved first" });
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const rows = parseCSV(req.file.buffer.toString("utf-8"));
      if (rows.length === 0) return res.status(400).json({ message: "CSV file is empty or has no data rows" });
      const results = { imported: 0, failed: 0, errors: [] as string[] };
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
          await storage.createCar(body);
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
      const biz = await storage.getBusinessByOwnerId(req.user.id);
      if (!biz) return res.status(403).json({ message: "No business found" });
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const rows = parseCSV(req.file.buffer.toString("utf-8"));
      if (rows.length === 0) return res.status(400).json({ message: "CSV file is empty or has no data rows" });
      const results = { imported: 0, failed: 0, errors: [] as string[] };
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
          await storage.createSparePart(body);
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
      const biz = await storage.getBusinessByOwnerId(req.user.id);
      if (!biz || biz.category !== "garage") return res.status(403).json({ message: "Only garages can import services" });
      if (biz.status !== "approved") return res.status(403).json({ message: "Your business must be approved first" });
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const rows = parseCSV(req.file.buffer.toString("utf-8"));
      if (rows.length === 0) return res.status(400).json({ message: "CSV file is empty or has no data rows" });
      const results = { imported: 0, failed: 0, errors: [] as string[] };
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const body = insertGarageServiceSchema.parse({
            garageId: biz.id,
            name: row.name || "",
            description: row.description || null,
            price: row.price || null,
            popular: false,
          });
          await storage.createGarageService(body);
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
      const biz = await storage.getBusinessByOwnerId(req.user.id);
      const supportCategories = ["insurance", "car_wash", "other"];
      if (!biz || !supportCategories.includes(biz.category)) return res.status(403).json({ message: "Only automotive support businesses can import services" });
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const rows = parseCSV(req.file.buffer.toString("utf-8"));
      if (rows.length === 0) return res.status(400).json({ message: "CSV file is empty or has no data rows" });
      const results = { imported: 0, failed: 0, errors: [] as string[] };
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const body = insertSupportServiceSchema.parse({
            businessId: biz.id,
            name: row.name || "",
            description: row.description || null,
            price: row.price || null,
          });
          await storage.createSupportService(body);
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

  // ─── Admin Export ─────────────────────────────────────────────────────────

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
      const rows = filtered.map(b => [b.id, b.name, b.category, b.status, b.city, b.address, b.phone, b.whatsapp, b.description, b.premium, b.premiumExpiresAt, b.createdAt]);
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
      const rows = allUsers.map(u => [u.id, u.name, u.email, u.role, u.createdAt]);
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

  // ─── Admin Import ─────────────────────────────────────────────────────────

  function normalizeKeBusinessPhone(raw: string): string {
    let d = raw.replace(/\D/g, "");
    if (d.startsWith("0") && d.length >= 9) d = `254${d.slice(1)}`;
    if (!d.startsWith("254") && d.length === 9) d = `254${d}`;
    return d;
  }

  app.post("/api/admin/import/businesses", adminMiddleware, csvUpload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const rows = parseCSV(req.file.buffer.toString("utf-8"));
      if (rows.length === 0) return res.status(400).json({ message: "CSV file is empty or has no data rows" });
      const existingPhones = await db.select({ phone: businesses.phone }).from(businesses);
      const knownNormalizedPhones = new Set(
        existingPhones.map((r) => normalizeKeBusinessPhone(r.phone || "")).filter((p) => p.length >= 9)
      );
      const seenInFile = new Set<string>();
      const results = { imported: 0, failed: 0, skipped: 0, errors: [] as string[] };
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const norm = normalizeKeBusinessPhone(row.phone || "");
          if (norm.length < 9) {
            results.failed++;
            results.errors.push(`Row ${i + 2}: phone missing or too short`);
            continue;
          }
          if (seenInFile.has(norm)) {
            results.skipped++;
            results.errors.push(`Row ${i + 2}: duplicate phone in this file`);
            continue;
          }
          if (knownNormalizedPhones.has(norm)) {
            results.skipped++;
            results.errors.push(`Row ${i + 2}: duplicate phone (already in directory)`);
            continue;
          }
          const body = insertBusinessSchema.parse({
            ownerId: req.user.id,
            name: row.name || "",
            category: row.category || "other",
            phone: row.phone || "",
            whatsapp: row.whatsapp || row.phone || "",
            address: row.address || "",
            city: row.city || "",
            description: (row.description ?? "").trim() || "Imported listing",
            subcategory: row.subcategory || null,
            carBrands: row.carBrands ? row.carBrands.split("|") : null,
            premium: false,
          });
          const created = await storage.createBusiness(body);
          await storage.updateBusiness(created.id, { status: "approved" });
          knownNormalizedPhones.add(norm);
          seenInFile.add(norm);
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

  app.post("/api/gallery/:entityType/:entityId", authMiddleware, galleryUpload.single("image"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No image file uploaded" });
      const { entityType, entityId } = req.params;
      const url = `/uploads/gallery/${req.file.filename}`;
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
      await storage.deleteGalleryImage(req.params.id);
      const filePath = path.resolve(process.cwd(), image.url.replace(/^\//, ""));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  return httpServer;
}
