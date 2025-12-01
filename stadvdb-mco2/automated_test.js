// automated_test.js
// FULL SUITE: TC-01 to TC-04 (Fixed Target ID)

require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_CONFIG = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 15
};

const NODES = {
    Node0: { port: Number(process.env.NODE0_PORT) || 60796 }
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runTestScript() {
    console.log("STARTING MCO2 AUTOMATED TEST SUITE (3 TRIALS PER CASE)");
    console.log("==========================================================");

    const pool = mysql.createPool({ ...DB_CONFIG, port: NODES.Node0.port });
    let targetID = 'tt0000284';

    try {
        // 2. SAFETY CHECK: Verify it actually exists before starting
        const [rows] = await pool.query("SELECT tconst, primaryTitle FROM node0_titles WHERE tconst = ?", [targetID]);
        
        if (rows.length > 0) {
            console.log(`[SETUP] Target Movie Found: ${targetID} ("${rows[0].primaryTitle}")`);
        } else {
            console.log(`[SETUP] Warning: ${targetID} not found. Searching for any valid movie...`);
            const [backup] = await pool.query("SELECT tconst, primaryTitle FROM node0_titles LIMIT 1");
            if (backup.length > 0) {
                targetID = backup[0].tconst;
                console.log(`[SETUP] Switched to available movie: ${targetID} ("${backup[0].primaryTitle}")`);
            } else {
                throw new Error("Database is empty.");
            }
        }

        // =================================================================
        // TC-01: STEP 3 CASE #1 (Concurrent Reads)
        // =================================================================
        console.log("\n----------------------------------------------------------");
        console.log("[TC-01] Requirement: Step 3 Case #1 (Concurrent Reads)");
        console.log("Isolation: READ COMMITTED | Expectation: Both read success");
        console.log("----------------------------------------------------------");

        for (let i = 1; i <= 3; i++) {
            const conn1 = await pool.getConnection();
            const conn2 = await pool.getConnection();
            try {
                await conn1.query("SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED");
                await conn2.query("SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED");
                
                const [res1, res2] = await Promise.all([
                    conn1.query("SELECT primaryTitle FROM node0_titles WHERE tconst = ?", [targetID]),
                    conn2.query("SELECT primaryTitle FROM node0_titles WHERE tconst = ?", [targetID])
                ]);

                if (res1[0][0].primaryTitle === res2[0][0].primaryTitle) {
                    console.log(`   [Trial ${i}] PASS`);
                } else {
                    console.log(`   [Trial ${i}] FAIL (Data mismatch)`);
                }
            } catch(e) { console.log(`   [Trial ${i}] ERROR: ${e.message}`); }
            finally { conn1.release(); conn2.release(); }
        }

        // =================================================================
        // TC-02: STEP 3 CASE #2 (Dirty Read)
        // =================================================================
        console.log("\n----------------------------------------------------------");
        console.log("[TC-02] Requirement: Step 3 Case #2 (Dirty Read Check)");
        console.log("Isolation: READ UNCOMMITTED | Expectation: Reader sees uncommitted data");
        console.log("----------------------------------------------------------");

        for (let i = 1; i <= 3; i++) {
            const connA = await pool.getConnection();
            const connB = await pool.getConnection();
            try {
                await connA.query("SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED");
                await connA.beginTransaction();
                await connA.query("UPDATE node0_titles SET primaryTitle = 'DIRTY_VAL' WHERE tconst = ?", [targetID]);
                
                await connB.query("SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED");
                const [rows] = await connB.query("SELECT primaryTitle FROM node0_titles WHERE tconst = ?", [targetID]);
                
                if (rows[0].primaryTitle === 'DIRTY_VAL') {
                    console.log(`   [Trial ${i}] PASS (Dirty read detected)`);
                } else {
                    console.log(`   [Trial ${i}] FAIL (System shielded data)`);
                }
                await connA.rollback();
            } catch(e) { console.log(`   [Trial ${i}] ERROR: ${e.message}`); }
            finally { connA.release(); connB.release(); }
        }

        // =================================================================
        // TC-03: STEP 3 CASE #2 Variation (Consistency Check)
        // =================================================================
        console.log("\n----------------------------------------------------------");
        console.log("[TC-03] Requirement: Step 3 Case #2 (Consistency Check)");
        console.log("Isolation: REPEATABLE READ | Expectation: Reader shielded from dirty data");
        console.log("----------------------------------------------------------");

        for (let i = 1; i <= 3; i++) {
            const connC = await pool.getConnection();
            const connD = await pool.getConnection();
            try {
                await connC.query("SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ");
                await connC.beginTransaction();
                await connC.query("UPDATE node0_titles SET primaryTitle = 'CLEAN_VAL' WHERE tconst = ?", [targetID]);
                
                await connD.query("SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ");
                const [rows] = await connD.query("SELECT primaryTitle FROM node0_titles WHERE tconst = ?", [targetID]);
                
                if (rows[0].primaryTitle !== 'CLEAN_VAL') {
                    console.log(`   [Trial ${i}] PASS (Shielded from uncommitted data)`);
                } else {
                    console.log(`   [Trial ${i}] FAIL (Dirty read occurred)`);
                }
                await connC.rollback();
            } catch(e) { console.log(`   [Trial ${i}] ERROR: ${e.message}`); }
            finally { connC.release(); connD.release(); }
        }

        // =================================================================
        // TC-04: STEP 3 CASE #3 (Concurrent Writes)
        // =================================================================
        console.log("\n----------------------------------------------------------");
        console.log("[TC-04] Requirement: Step 3 Case #3 (Concurrent Writes)");
        console.log("Isolation: SERIALIZABLE | Expectation: 2nd Writer blocked/waits");
        console.log("----------------------------------------------------------");

        for (let i = 1; i <= 3; i++) {
            const connE = await pool.getConnection();
            const connF = await pool.getConnection();
            try {
                await connE.query("SET SESSION TRANSACTION ISOLATION LEVEL SERIALIZABLE");
                await connF.query("SET SESSION TRANSACTION ISOLATION LEVEL SERIALIZABLE");
                await connE.beginTransaction();
                await connF.beginTransaction();

                await connE.query("SELECT * FROM node0_titles WHERE tconst = ? FOR UPDATE", [targetID]);
                
                let fFinished = false;
                connF.query("SELECT * FROM node0_titles WHERE tconst = ? FOR UPDATE", [targetID])
                    .then(() => { fFinished = true; });

                await delay(1500);

                if (!fFinished) {
                    console.log(`   [Trial ${i}] PASS (User B successfully blocked)`);
                } else {
                    console.log(`   [Trial ${i}] FAIL (User B was NOT blocked)`);
                }

                await connE.commit();
                await connF.rollback();
            } catch(e) { console.log(`   [Trial ${i}] ERROR: ${e.message}`); }
            finally { connE.release(); connF.release(); }
        }

    } catch (err) {
        console.error("ERROR:", err.message);
    } finally {
        await pool.end();
        console.log("\n==========================================================");
        console.log("TEST SCRIPT COMPLETE");
        process.exit();
    }
}

runTestScript();