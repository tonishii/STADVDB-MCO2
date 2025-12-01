// recovery_test5.js
// GOAL: Prove Central Node stays alive when Node 2 dies.
// 1. Shutdown Node 2 in Proxmox.
// 2. Run: node recovery_test5.js.js

require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_CONFIG = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: Number(process.env.NODE0_PORT) || 60796 // ALWAYS connect to Central
};

async function runTest() {
    console.log("🚑 STARTING TC-05: NODE 2 FAILURE WRITE TEST");
    console.log("   (Make sure Node 2 is OFF for this test)");

    const pool = mysql.createPool(DB_CONFIG);

    try {
        console.log(`[ATTEMPT] Writing 'Crash Test Movie' to Central Node...`);
        const [result] = await pool.query(
            "INSERT INTO node0_titles (tconst, primaryTitle, startYear) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE primaryTitle = VALUES(primaryTitle)",
            ['tt_crash_TC05', 'Crash Test TC-05', 1970]
        );

        console.log("   ✅ PASS: Central Node accepted the write.");
        console.log("   Interpretation: System handled the partial failure gracefully.");

    } catch (err) {
        console.error("   ❌ FAIL:", err.message);
    } finally {
        await pool.end();
    }
}

runTest();