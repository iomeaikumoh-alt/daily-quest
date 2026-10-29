import { Router, type IRouter } from "express";
import { parseText } from "../ai/service";
import { BadRequestError, readNow, readText } from "./request-utils";

const router: IRouter = Router();

router.post("/parse", async (req, res) => {
  try {
    const text = readText(req, "text", 500);
    const current = readNow(req);
    const result = await parseText(text, current);
    req.log.info(
      { source: result.source, items: result.items.length, fallbackReason: result.fallbackReason },
      "Parsed natural language input",
    );
    res.json(result);
  } catch (err) {
    if (err instanceof BadRequestError) {
      res.status(400).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "Parse request failed");
    res.status(500).json({ error: "입력을 분석하지 못했어요. 잠시 후 다시 시도해 주세요." });
  }
});

export default router;
