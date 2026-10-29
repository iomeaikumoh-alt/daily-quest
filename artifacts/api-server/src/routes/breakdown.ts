import { Router, type IRouter } from "express";
import { breakdownGoal, resplitTask } from "../ai/service";
import { BadRequestError, readNow, readOptionalDate, readText } from "./request-utils";

const router: IRouter = Router();

router.post("/breakdown", async (req, res) => {
  try {
    const goal = readText(req, "goal", 200);
    const deadline = readOptionalDate(req, "deadline");
    const current = readNow(req);
    const result = await breakdownGoal(goal, deadline, current);
    req.log.info(
      { source: result.source, subtasks: result.subtasks.length, fallbackReason: result.fallbackReason },
      "Broke goal down into subtasks",
    );
    res.json(result);
  } catch (err) {
    if (err instanceof BadRequestError) {
      res.status(400).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "Breakdown request failed");
    res.status(500).json({ error: "목표를 나누지 못했어요. 잠시 후 다시 시도해 주세요." });
  }
});

router.post("/resplit", async (req, res) => {
  try {
    const title = readText(req, "title", 120);
    const current = readNow(req);
    const result = await resplitTask(title, current);
    req.log.info(
      { source: result.source, subtasks: result.subtasks.length, fallbackReason: result.fallbackReason },
      "Split task into smaller subtasks",
    );
    res.json(result);
  } catch (err) {
    if (err instanceof BadRequestError) {
      res.status(400).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "Resplit request failed");
    res.status(500).json({ error: "퀘스트를 나누지 못했어요. 잠시 후 다시 시도해 주세요." });
  }
});

export default router;
