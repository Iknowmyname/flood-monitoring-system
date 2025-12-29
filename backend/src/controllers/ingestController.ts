import type {Request, Response} from "express";
import { insertReadings, type Readings } from "../repos/readingsRepository";


type ReadingsBody = {
    items: Readings[];
};


export async function ingestReadings(req: Request <{}, {}, ReadingsBody>, res: Response) {

    try {
        const items = req.body?.items;
        
        if (!Array.isArray(items) || items.length == 0){
            return res.status(400).json({
                error: "Bad Request",
                message: "Body must be type of Readings and items cannot be empty.",
            })
        }

        for (const item of items) {
            if (!item.stationId || !item.recordedAt || !item.source) {
                return res.status(400).json({
                    error: "Bad Request",
                    message: "Each item cant contain null for stationId, recordedAt and source",
                });
            }
        }

        const processed = await insertReadings(items);

        return res.status(202).json({
            ok: true,
            processed,
        });
    } catch (err) {
        console.error("IngestReadings failed: ", err);
        res.status(500).json({error: "Internal Server Error" });
    }
}