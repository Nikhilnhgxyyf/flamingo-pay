import { Router, type IRouter } from "express";
import { activeBills } from "../state/activeBills";

const router: IRouter = Router();

router.get("/status/:merchantId", (req, res) => {
  const bill = activeBills[req.params.merchantId];

  if (!bill) {
    res.json({ status: "waiting" });
    return;
  }

  res.json({
    status: "active",
    data: bill,
  });
});

export default router;