import express from "express";
import pool from "./db.js";
import stationRoutes from "./routes/stationsRoutes.js";
import readingRoutes from "./routes/readingRoutes.js";
import { initSchedulers } from "./queue/scheduler.js";
import { setupBullBoard } from "./queue/bullBoard.js";
import cors from "cors";


const app = express();

app.use(express.json());

//Stations DB Connection Test
app.use("/api/stations", stationRoutes);

app.use("/api/readings", readingRoutes);

app.use(
  cors({
    origin: [
      "https://flood-monitoring-system-live.vercel.app",
      "https://flood-monitoring-system-drab.vercel.app",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ],
    methods: ["GET", "POST", "OPTIONS"],
  })
);

const PORT = process.env.PORT || 3000;

initSchedulers().catch((e) => console.error("Ingestion Scheduler failed ", e));

setupBullBoard(app);

app.listen(PORT,async () => {
    try{
        const result = await pool.query("SELECT NOW()");
        console.log("DB connected at: ", result.rows[0].now);
    } catch(err){
        console.error("DB connection failed", err);
    }
    console.log(`Backend is running on port: ${PORT}`);
});
