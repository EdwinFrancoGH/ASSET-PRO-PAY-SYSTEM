import express from "express";
import { verifyRoles } from "../middlewares/auth.middleware.js";
import { ROLES } from "../config/roles.js";
import {
    getUsers,
    getAutorizadores,
    createUser,
    updateUser,
    deleteUser,
    updateProfile
} from "../controllers/users.controller.js";

const router = express.Router();

// Para cualquier usuario autenticado
router.put("/profile", updateProfile);
router.get("/autorizadores", getAutorizadores);

// Solo Administrador
router.use(verifyRoles(ROLES.ADMIN));

router.get("/", getUsers);
router.post("/", createUser);
router.put("/:uid", updateUser);
router.delete("/:uid", deleteUser);

export default router;
