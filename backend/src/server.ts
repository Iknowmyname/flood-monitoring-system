import express from "express";
import pool from "./db.js";

const app = express();

app.use(express.json());

app.get("/health", (req,res) => {

    res.status(200).json({
        status: "ok",
        service: "flood-backend",
        timestamp: new Date().toISOString()
    });
});


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
