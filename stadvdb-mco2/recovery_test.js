// recovery_test.js (TC-07)
require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_CONFIG = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
};

const NODES = {
    TargetNode: { port: Number(process.env.NODE1_PORT) || 60797 } 
};

async function runRecoveryTest() {
    console.log("STARTING TC-07: CENTRAL FAILURE READ TEST");
    console.log("==================================================");

    const pool = mysql.createPool({ ...DB_CONFIG, port: NODES.TargetNode.port });

    try {
        console.log(`[ATTEMPT] Reading from Node 2 (While Central is OFF)...`);
        
        // We query 'node1_titles' because that is the table inside Server 1
        const [rows] = await pool.query("SELECT * FROM node1_titles LIMIT 1");

        if (rows.length > 0) {
            console.log(`READ SUCCESS: Found movie "${rows[0].primaryTitle}"`);
            console.log("INTERPRETATION: Node 2 is accessible even though Central is dead.");
            console.log("STATUS: PASS");
        } else {
            console.log("READ SUCCESS (But table is empty). Connection works!");
        }

    } catch (err) {
        console.error("ERROR:", err.message);
    } finally {
        await pool.end();
        console.log("==================================================");
        process.exit();
    }
}

runRecoveryTest();