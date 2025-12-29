import type {Request, Response} from "express";
import { floodIngestQueue } from "../queue/floodIngestQueue";

export async function enqueueFloodIngest(req: Request, res: Response) {
    try {
        const state = String(req.body.state ?? "").trim();
        if (!state) return res.status(400).json({error: "Missing param state !"});

        const job = await floodIngestQueue.add(
            "ingest_state",
            { state },
            {
                attempts: 3,
                backoff: { type: "exponential", delay: 5000 },
                removeOnComplete: 50,
                removeOnFail: 50,
            }
        );

        return res.status(200).json({ queued: true, jobid: job.id, state });
    } catch (err) {
        console.error("enqueue failed" , err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}