import express from "express";
import pool from "./db.js";
import stationRoutes from "./routes/stationsRoutes.js";
import healthCheckRoute from "./routes/healthCheckRoute.js"

const app = express();

app.use(express.json());


//Health Endpoint Test
// app.get("/health", (req,res) => {

//     res.status(200).json({
//         status: "ok",
//         service: "flood-backend",
//         timestamp: new Date().toISOString()
//     });
// });

//Stations DB Connection Test
app.use("/api/stations", stationRoutes);

app.use("/api/health", healthCheckRoute)


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
