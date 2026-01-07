import { floodIngestQueue } from "./floodIngestQueue.js";
import { redis } from "./redisConnection.js";

const STATES = [
  "PLS", "KDH", "PNG", "PRK", "SEL", "WLH", "PTJ", "NSN",
  "MLK", "JHR", "PHG", "TRG", "KEL", "SRK", "SAB", "WLP",
];

const EVERY_MS = 10 * 60 * 1000;

//Enqueue ingestion jobs with 10 minute intervals and 30 seconds delay between each state ingestion
export async function initSchedulers() {

    const state_offset = 30_000;

    for (let i = 0; i < STATES.length; i ++) {
        const state = STATES[i];
        const offset = i * state_offset;
        
        await floodIngestQueue.add(
            "ingest-state",
            { state },
            {
                repeat: { every: EVERY_MS},
                delay: offset,
                jobId: `repeat.ingest.${state}:${EVERY_MS}`,
                removeOnComplete: 50,
                removeOnFail: 50,
            }
        )
    }

    console.log(`[scheduler] registered ${STATES.length} repeat jobs: every ${EVERY_MS / 60000} minutes`);

}

