import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/", (_req, res) => {
  res.json({
    message: "Hello from Express!",
  });
});

export default router;