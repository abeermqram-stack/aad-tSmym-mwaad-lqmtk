import type { Request, RequestHandler } from "express";

export const requireAuth: RequestHandler = (req, res, next) => {
  next();
};

export function authenticatedUserId(req: Request): string {
  return "local_user_id";
}
