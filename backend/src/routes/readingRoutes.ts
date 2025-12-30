import { Router } from "express";
import { getLatestRain, getLatestWaterLevel } from "../controllers/latestReadings";

const router = Router();


router.get("/latest/rain", getLatestRain);

router.get("/latest/water_level", getLatestWaterLevel);


export default router;