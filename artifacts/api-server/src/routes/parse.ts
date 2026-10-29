import { Router, type IRouter } from "express";
import { mockAIProvider } from "../../../../lib/ai";
import { now } from "../../../../lib/clock";

const router: IRouter = Router();

router.post("/parse", async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  const requestedNow =
    typeof req.body?.now === "string" ? new Date(req.body.now) : now();
  const current = Number.isNaN(requestedNow.getTime()) ? now() : requestedNow;
  const delay = 800 + Math.floor(Math.random() * 401);
  await new Promise((resolve) => setTimeout(resolve, delay));
  const result = await mockAIProvider.parse(text, current);
  res.json(result);
});

export default router;