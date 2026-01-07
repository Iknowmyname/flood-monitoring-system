// Routes for latest rainfall and water-level readings
import { Router } from "express";
import { getLatestRain, getLatestWaterLevel } from "../controllers/latestReadings.js";

const router = Router();


router.get("/latest/rain", getLatestRain);

router.get("/latest/water_level", getLatestWaterLevel);


export default router;
