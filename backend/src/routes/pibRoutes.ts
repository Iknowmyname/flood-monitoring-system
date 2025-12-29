import {Router} from "express";
import {ingestPIB} from "../controllers/pibController.js";

const router = Router();

router.post("/ingest", ingestPIB);

export default router;