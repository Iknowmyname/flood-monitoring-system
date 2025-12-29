import {Router} from "express";
import { enqueueFloodIngest} from "../controllers/jobsController.js";

const router = Router();

router.post("/ingest", enqueueFloodIngest);

export default router;
