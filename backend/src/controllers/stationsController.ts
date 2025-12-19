import type {Request, Response} from "express";
import { getActiveStations } from "../services/stationService";

export async function getStations (req: Request, res: Response){

    try {
        const stations = await getActiveStations();
        res.status(200).json({stations});
    } catch (err) {
        console.error("getStations failed", err);
        res.status(500).json({error: "Internal Server Error"});
    }

}