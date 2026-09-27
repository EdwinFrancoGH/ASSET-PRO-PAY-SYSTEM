import { Router } from "express";
import { me } from "../controllers/auth.controller.js";

const router = Router();

router.get("/me", me);

export default router;
