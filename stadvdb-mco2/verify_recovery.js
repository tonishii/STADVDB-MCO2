// verify_recovery.js
require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkNode2() {
    console.log("🔎 CHECKING NODE 2 STATUS...");
    
    // Connect explicitly to Node 2 (Port 60797)
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        port: Number(process.env.NODE1_PORT) || 60797
    });

    try {
        // Search for the "Crash Test Movie" we wrote in TC-05
        const [rows] = await pool.query("SELECT * FROM node1_titles WHERE primaryTitle LIKE '%Crash Test%'");
        
        if (rows.length > 0) {
            console.log("✅ PASS: Automatic Recovery Worked!");
            console.log(`   Found: "${rows[0].primaryTitle}" in Node 2.`);
            console.log("   (The system synced the data silently when the node woke up.)");
        } else {
            console.log("⚠️ INCOMPLETE: Data is missing from Node 2.");
            console.log("   (The system captured the write on Central, but hasn't pushed it to Node 2 yet.)");
            console.log("   Conclusion: Recovery requires manual trigger or wasn't implemented.");
        }
    } catch (err) {
        console.error("❌ ERROR: Could not connect to Node 2. Is it turned ON?", err.message);
    } finally {
        await pool.end();
    }
}

checkNode2();