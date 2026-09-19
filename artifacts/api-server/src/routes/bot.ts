import { Router, type IRouter } from "express";
import { activeBills } from "../state/activeBills";

const router: IRouter = Router();

router.post("/", (req, res) => {
  const message =
    typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const args = message.split(/\s+/).filter(Boolean);

  if (args.length < 1 || args.length > 2) {
    res.status(400).json({
      error: "Send an amount, optionally followed by a target phone number.",
    });
    return;
  }

  const amount = Number(args[0]);

  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({
      error: "Amount must be a positive number.",
    });
    return;
  }

  activeBills["merchant_001"] = {
    amount,
    targetPhone: args[1] ?? null,
  };

  res.json({ reply: "✅ Standee ready..." });
});

export default router;