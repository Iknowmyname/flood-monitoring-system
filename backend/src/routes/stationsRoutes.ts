import {Router} from "express";
import {getStations} from "../controllers/stationsController.js"

const router = Router();

router.get("/", getStations);

export default router;