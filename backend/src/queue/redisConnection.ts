import "dotenv/config";
import {Redis} from "ioredis";

const url = process.env.REDIS_URL;

if (!url) {
    throw new Error("REDIS_URL not defined");
}

export const redis = new Redis(url, {
  maxRetriesPerRequest: null,
});

