import express from "express";
import pool from "./db.js";
import stationRoutes from "./routes/stationsRoutes.js";
import ingestRoutes from "./routes/ingestRoutes.js";
import pibRoutes from "./routes/pibRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";

const app = express();

app.use(express.json());

//Stations DB Connection Test
app.use("/api/stations", stationRoutes);

app.use("/api/ingest", ingestRoutes);

app.use("/api/pib", pibRoutes);

app.use("/api/jobs", jobRoutes);

const PORT = 3000;

app.listen(PORT,async () => {
    try{
        const result = await pool.query("SELECT NOW()");
        console.log("DB connected at: ", result.rows[0].now);
    } catch(err){
        console.error("DB connection failed", err);
    }
    console.log(`Backend is running on port: ${PORT}`);
});
