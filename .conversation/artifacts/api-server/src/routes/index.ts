import { Router, type IRouter } from "express";
import healthRouter from "./health";
import hondaPosRouter from "./honda-pos";

const router: IRouter = Router();

router.use(healthRouter);
router.use(hondaPosRouter);

export default router;
