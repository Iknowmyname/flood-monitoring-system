import type {Request, Response } from "express";
import {ingestPIBState} from "../services/pibIngestService.js";

export async function ingestPIB(req: Request, res: Response) {
    try {
        const state = String(req.query.state ?? "").trim();
        if (!state) return res.status(400).json({error : "Request query missing parameter state"});

        const result = await ingestPIBState(state);
        return res.status(200).json(result);
    } catch (err) {
        console.error("IngestPIB failed :", err);
        return res.status(500).json({ error: "Internal Server Error"});
    }
}