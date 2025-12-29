import {Worker} from "bullmq";
import {redis} from "./queue/redisConnection.js";
import type {FloodIngestJob} from "./queue/floodIngestQueue.js";
import { ingestPIBState } from "./services/pibIngestService.js";


export const ingestWorker = new Worker(
    "flood-ingest",
    async (job) => {
        const {state} = job.data;

        const result = await ingestPIBState(state);

        return result;
    },
    {
    connection: redis,
    concurrency: 1,    
    }
);


ingestWorker.on("completed", (job, result) => {
    console.log(`[worker] completed job ${job.id}`, result);
});

ingestWorker.on("failed", (job, err) => {
    console.error(`[worker] failed job ${job?.id}`, err)
});