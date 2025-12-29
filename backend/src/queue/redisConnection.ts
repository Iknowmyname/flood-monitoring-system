import "dotenv/config";
import IORedis from "ioredis";

const url = process.env.REDIS_URL;

if (!url) {
    throw new Error("REDIS_URL not defined");
}

export const redis = new IORedis(url, {
    maxRetriesPerRequest: null,
});

