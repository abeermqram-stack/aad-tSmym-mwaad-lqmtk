import { getAuth } from "@clerk/express";
import type { Request, RequestHandler } from "express";
import { HttpError } from "../lib/http-error";

export const requireAuth: RequestHandler = (req, res, next) => {
  if (!getAuth(req).userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  next();
};

export function authenticatedUserId(req: Request): string {
  const userId = getAuth(req).userId;
  if (!userId) {
    throw new HttpError(401, "Authentication required");
  }
  return userId;
}
