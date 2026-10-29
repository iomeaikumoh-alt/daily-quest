import { Router, type IRouter } from "express";
import { getAIConfig } from "../ai/config";
import { rateLimit } from "../middlewares/rate-limit";
import breakdownRouter from "./breakdown";
import healthRouter from "./health";
import parseRouter from "./parse";

const router: IRouter = Router();

const aiRateLimit = rateLimit({
  windowMs: 60_000,
  max: () => getAIConfig().rateLimitPerMinute,
});

router.use(healthRouter);
router.use(["/parse", "/breakdown", "/resplit"], aiRateLimit);
router.use(parseRouter);
router.use(breakdownRouter);

export default router;
