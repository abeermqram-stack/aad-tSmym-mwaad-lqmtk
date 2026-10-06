import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mealsRouter from "./meals";
import dashboardRouter from "./dashboard";
import preferencesRouter from "./preferences";
import pushRouter from "./push";
import { requireAuth } from "../middlewares/require-auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(pushRouter);
router.use(requireAuth);
router.use(mealsRouter);
router.use(dashboardRouter);
router.use(preferencesRouter);

export default router;
