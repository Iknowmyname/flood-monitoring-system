import {Pool} from "pg";

const pool = new Pool({
    host: "localhost",
    port: 5432,
    user: "flood_user",
    password: "flood_pass",
    database: "flood_db",
});

export default pool;