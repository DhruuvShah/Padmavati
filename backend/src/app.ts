import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import { healthRouter } from "./routes/health.routes";
import { uploadImageRouter } from "./routes/upload-image.routes";
import { catalogueRouter } from "./routes/catalogue.routes";
import { catalogueAccessRouter } from "./routes/catalogue-access.routes";
import { adminRequestsRouter } from "./routes/admin-requests.routes";

/**
 * Builds the Express app without binding to a port, so tests can exercise
 * routes directly via supertest. `server.ts` is the only place that calls
 * `.listen()`.
 */
export function createApp(): Express {
  const app = express();
  const cookieSecret = process.env.COOKIE_SECRET || "fallback-dev-secret";

  app.use(express.json());
  app.use(cookieParser(cookieSecret));

  const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000").split(",");
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(healthRouter);
  app.use(uploadImageRouter);
  app.use(catalogueRouter);
  app.use(catalogueAccessRouter);
  app.use(adminRequestsRouter);

  return app;
}
