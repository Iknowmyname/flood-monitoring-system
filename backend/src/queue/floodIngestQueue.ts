import {Queue} from "bullmq";
import {redis} from "./redisConnection.js";

export type FloodIngestJob = {
    state: string;
}

export const floodIngestQueue = new Queue<FloodIngestJob>("flood-ingest", {
    connection: redis,
});