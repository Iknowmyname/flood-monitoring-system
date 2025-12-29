import {Router} from "express";
import { ingestReadings } from "../controllers/ingestController";

const router = Router();

router.post("/readings", ingestReadings);


export default router;