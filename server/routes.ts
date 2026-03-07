import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { insertUserSchema, insertBusinessSchema, insertSparePartSchema, insertReviewSchema, insertMessageSchema } from "@shared/schema";

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

  app.get("/api/businesses", async (req, res) => {
    try {
      const { q, category, city, minRating } = req.query as Record<string, string>;
      const biz = await storage.getAllBusinesses({
        q,
        category,
        city,
        minRating: minRating ? parseFloat(minRating) : undefined,
      });
      res.json(biz);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/businesses/:id", async (req, res) => {
    try {
      const business = await storage.getBusinessById(req.params.id);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const [reviews, spareParts, { avgRating, reviewCount }] = await Promise.all([
        storage.getReviewsByBusinessId(req.params.id),
        storage.getSparePartsByBusinessId(req.params.id),
        storage.getAvgRating(req.params.id),
      ]);
      res.json({ business: { ...business, avgRating, reviewCount }, reviews, spareParts });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/businesses", authMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;
      const body = insertBusinessSchema.parse({ ...req.body, ownerId: user.id });
      const biz = await storage.createBusiness(body);
      res.json(biz);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
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

  // Dashboard route
  app.get("/api/dashboard", ownerMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;
      const business = await storage.getBusinessByOwnerId(user.id);
      if (!business) return res.json({ business: null, messages: [], reviews: [], spareParts: [] });
      const [msgs, revs, parts] = await Promise.all([
        storage.getMessagesByBusinessId(business.id),
        storage.getReviewsByBusinessId(business.id),
        storage.getSparePartsByBusinessId(business.id),
      ]);
      res.json({ business, messages: msgs, reviews: revs, spareParts: parts });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Admin routes
  app.get("/api/admin", adminMiddleware, async (req, res) => {
    try {
      const [pending, approved, allReviews, allUsers] = await Promise.all([
        storage.getPendingBusinesses(),
        storage.getApprovedBusinesses(),
        storage.getAllReviews(),
        storage.getAllUsers(),
      ]);
      res.json({
        stats: {
          total: pending.length + approved.length,
          pending: pending.length,
          approved: approved.length,
          totalReviews: allReviews.length,
        },
        pending,
        approved,
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
      res.json(biz);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.put("/api/admin/businesses/:id/reject", adminMiddleware, async (req, res) => {
    try {
      const biz = await storage.updateBusiness(req.params.id, { status: "rejected" });
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

  app.delete("/api/parts/:id", ownerMiddleware, async (req, res) => {
    try {
      await storage.deleteSparePart(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Reviews
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

  return httpServer;
}
