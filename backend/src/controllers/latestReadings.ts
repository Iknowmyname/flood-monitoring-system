// Controller for exposing latest readings for rainfall and water-level per station
import type { Request, Response } from "express";
import { latestRainReading, latestWaterLevelReading } from "../repos/readingsRepository";


export async function getLatestRain (req: Request, res: Response) {


    try {
        const state = String(req.query.state ?? "").trim() || undefined;
        const limit = Number(req.query.limit ?? 1000);
        const data = await latestRainReading(state, Number.isFinite(limit) ? limit:1000);
        return res.status(200).json({ items:data });
    } catch (err) {
        console.error("getLatestRain failed: ", err);
        return res.status(500).json({ error: "Internal Server Error"});
    }
}


export async function getLatestWaterLevel(req: Request, res: Response) {
  try {
    const state = String(req.query.state ?? "").trim() || undefined;
    const limit = Number(req.query.limit ?? 1000);
    const data = await latestWaterLevelReading(state, Number.isFinite(limit) ? limit : 1000);
    return res.status(200).json({ items: data });
  } catch (err) {
    console.error("getLatestWaterLevel failed:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}