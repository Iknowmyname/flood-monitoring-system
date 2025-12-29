import type {Request, Response} from "express";
import { getActiveStations } from "../services/stationService";


function parseLimitOffsetByInt(value: unknown, revert: number): number {

    if (typeof value !== "string") return revert;

    const parsedValue = Number(value);
    if (!Number.isInteger(parsedValue) || parsedValue <= 0) return revert;

    return parsedValue;
}


function parseStrings(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

export async function getStations (req: Request, res: Response){

    try {

        const state = parseStrings(req.query.state);
        const district = parseStrings(req.query.district);

        const page = parseLimitOffsetByInt(req.query.page, 1);
        const limit = parseLimitOffsetByInt(req.query.limit, 50);

        const stations = await getActiveStations({state, district, page, limit });
        return res.status(200).json({stations});
    } catch (err) {
        console.error("getStations failed", err);
        res.status(500).json({error: "Internal Server Error"});
    }

}