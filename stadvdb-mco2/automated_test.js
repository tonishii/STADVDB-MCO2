// automated_test.js
// TC-01 to TC-04

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
    Node0: { port: Number(process.env.NODE0_PORT) || 60796 }
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runTestScript() {
    console.log("🚀 STARTING FULL CONCURRENCY TEST SUITE (TC-01 to TC-04)");
    console.log("========================================================");

    const pool = mysql.createPool({ ...DB_CONFIG, port: NODES.Node0.port });
    let targetID = 'tt0000001'; 

    try {
        // --- SETUP: FIND A VALID MOVIE ---
        const [rows] = await pool.query("SELECT tconst, primaryTitle FROM node0_titles LIMIT 1");
        if (rows.length > 0) {
            targetID = rows[0].tconst;
            console.log(`[SETUP] Target Movie: ${targetID} ("${rows[0].primaryTitle}")`);
        } else {
            throw new Error("Database is empty.");
        }

        // =================================================================
        // TC-01: CONCURRENT READS (Read Committed)
        // Two users read exactly at the same time. Both should succeed.
        // =================================================================
        console.log("\n[TC-01] Testing CONCURRENT READS...");
        const conn1 = await pool.getConnection();
        const conn2 = await pool.getConnection();
        try {
            await conn1.query("SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED");
            await conn2.query("SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED");
            
            // Fire both requests simultaneously using Promise.all
            const [res1, res2] = await Promise.all([
                conn1.query("SELECT primaryTitle FROM node0_titles WHERE tconst = ?", [targetID]),
                conn2.query("SELECT primaryTitle FROM node0_titles WHERE tconst = ?", [targetID])
            ]);

            console.log(`   -> User A Read: "${res1[0][0].primaryTitle}"`);
            console.log(`   -> User B Read: "${res2[0][0].primaryTitle}"`);

            if (res1[0][0].primaryTitle === res2[0][0].primaryTitle) {
                console.log("   ✅ PASS: Both users read identical data simultaneously.");
            } else {
                console.log("   ❌ FAIL: Data mismatch.");
            }
        } finally {
            conn1.release(); conn2.release();
        }

        // =================================================================
        // TC-02: DIRTY READ SIMULATION (Read Uncommitted)
        // User A updates (no commit). User B reads. B should see new data.
        // =================================================================
        console.log("\n[TC-02] Testing DIRTY READ (Read Uncommitted)...");
        const connA = await pool.getConnection();
        const connB = await pool.getConnection();
        try {
            await connA.query("SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED");
            await connA.beginTransaction();
            await connA.query("UPDATE node0_titles SET primaryTitle = 'DIRTY_VAL' WHERE tconst = ?", [targetID]);
            
            await connB.query("SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED");
            const [rows] = await connB.query("SELECT primaryTitle FROM node0_titles WHERE tconst = ?", [targetID]);
            
            if (rows[0].primaryTitle === 'DIRTY_VAL') {
                console.log("   ✅ PASS: Dirty Read Detected (User B saw uncommitted data).");
            } else {
                console.log("   ⚠️ NOTE: System shielded the data (Unexpected for Read Uncommitted).");
            }
            await connA.rollback(); // Cleanup
        } finally {
            connA.release(); connB.release();
        }

        // =================================================================
        // TC-03: NON-REPEATABLE READ CHECK (Read Committed)
        // A reads. B updates & commits. A reads again. A should see NEW data.
        // =================================================================
        console.log("\n[TC-03] Testing NON-REPEATABLE READ (Read Committed)...");
        const connC = await pool.getConnection();
        const connD = await pool.getConnection();
        try {
            await connC.query("SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED");
            await connC.beginTransaction();
            
            // 1. User C reads original
            const [read1] = await connC.query("SELECT primaryTitle FROM node0_titles WHERE tconst = ?", [targetID]);
            const originalTitle = read1[0].primaryTitle;
            console.log(`   -> User C reads first: "${originalTitle}"`);

            // 2. User D updates and COMMITS
            await connD.query("UPDATE node0_titles SET primaryTitle = 'NEW_COMMITTED_VAL' WHERE tconst = ?", [targetID]);
            console.log("   -> User D updated and Committed.");

            // 3. User C reads again (in same transaction)
            const [read2] = await connC.query("SELECT primaryTitle FROM node0_titles WHERE tconst = ?", [targetID]);
            console.log(`   -> User C reads again: "${read2[0].primaryTitle}"`);

            if (read2[0].primaryTitle !== originalTitle) {
                console.log("   ✅ PASS: Non-Repeatable Read occurred (Allowed in Read Committed).");
            } else {
                console.log("   ⚠️ NOTE: Repeatable Read likely active (User C still sees old data).");
            }

            // Restore original title
            await connD.query("UPDATE node0_titles SET primaryTitle = ? WHERE tconst = ?", [originalTitle, targetID]);
        } finally {
            await connC.commit();
            connC.release(); connD.release();
        }

        // =================================================================
        // TC-04: CONCURRENT WRITE CONFLICT (Serializable)
        // User A updates. User B tries to update same row. B should WAIT/FAIL.
        // =================================================================
        console.log("\n[TC-04] Testing WRITE CONFLICT (Serializable)...");
        const connE = await pool.getConnection();
        const connF = await pool.getConnection();
        try {
            await connE.query("SET SESSION TRANSACTION ISOLATION LEVEL SERIALIZABLE");
            await connF.query("SET SESSION TRANSACTION ISOLATION LEVEL SERIALIZABLE");
            await connE.beginTransaction();
            await connF.beginTransaction();

            // 1. User E locks the row
            await connE.query("SELECT * FROM node0_titles WHERE tconst = ? FOR UPDATE", [targetID]);
            console.log("   -> User E acquired lock.");

            // 2. User F tries to acquire lock (Should block)
            console.log("   -> User F attempting lock (Expecting wait)...");
            
            let fFinished = false;
            const pF = connF.query("SELECT * FROM node0_titles WHERE tconst = ? FOR UPDATE", [targetID])
                .then(() => { fFinished = true; });

            // Wait 2 seconds. If F hasn't finished, E is successfully blocking F.
            await delay(2000);

            if (!fFinished) {
                console.log("   ✅ PASS: User F is blocked/waiting (Locking works).");
            } else {
                console.log("   ❌ FAIL: User F was NOT blocked.");
            }

            await connE.commit();
            await connF.rollback();
        } finally {
            connE.release(); connF.release();
        }

    } catch (err) {
        console.error("❌ ERROR:", err.message);
    } finally {
        await pool.end();
        console.log("========================================================");
        process.exit();
    }
}

runTestScript();