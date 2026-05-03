import { Router } from "express";
import { toNodeHandler } from "better-auth/node";
import { betterAuthInstance } from "../../config/better-auth.config.js";

export const userAuthenticationRouter = Router();

// Better Auth handles all /api/auth/* routes — sign-in, sign-up, sign-out, session.
// Must be mounted BEFORE express.json() so Better Auth can parse its own request bodies.
userAuthenticationRouter.all("/*splat", toNodeHandler(betterAuthInstance));
