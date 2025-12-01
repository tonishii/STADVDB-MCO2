import { TransactionLogEntry } from "./schema";
import { Pool } from "mysql2/promise";

export async function redo(tx: TransactionLogEntry, pool: Pool, node: string) {
  const conn = await pool.getConnection();
  const tableName = `node${node}_titles`;
  try {
    switch (tx.operation) {
      case "INSERT":
        await conn.query(
          `INSERT INTO ${tableName}(tconst, primaryTitle, startYear, runtimeMinutes, genres) 
          VALUES(?, ?, ?, ?, ?)`,
          [
            tx.values?.tconst,
            tx.values?.primaryTitle,
            tx.values?.startYear,
            tx.values?.runtimeMinutes,
            tx.values?.genres,
          ]
        );
        break;
      case "UPDATE":
        const columnsToUpdate = [];
        const values = [];
        if (tx.values?.primaryTitle !== undefined) {
          columnsToUpdate.push("primaryTitle = ?");
          values.push(tx.values.primaryTitle);
        }
        if (tx.values?.startYear !== undefined) {
          columnsToUpdate.push("startYear = ?");
          values.push(tx.values.startYear);
        }
        if (tx.values?.runtimeMinutes !== undefined) {
          columnsToUpdate.push("runtimeMinutes = ?");
          values.push(tx.values.runtimeMinutes);
        }
        if (tx.values?.genres !== undefined) {
          columnsToUpdate.push("genres = ?");
          values.push(tx.values.genres);
        }

        values.push(tx.values?.tconst);

        await conn.query(
          `UPDATE ${tableName} SET ${columnsToUpdate.join(
            ", "
          )} WHERE tconst = ?`,
          values
        );
        break;
      case "DELETE":
        await conn.query(
          `DELETE FROM ${tableName} WHERE tconst = ?`,
          tx.values?.tconst
        );
        break;
    }
  } catch (err) {
    console.error(`Failed to redo ${tx.operation} level`, err);
  } finally {
    if (conn) conn.release();
  }
}

export async function undo(tx: TransactionLogEntry, pool: Pool, node: string) {
  const conn = await pool.getConnection();
  const tableName = `node${node}_titles`;
  try {
    switch (tx.operation) {
      case "INSERT":
        await conn.query(
          `DELETE FROM ${tableName} WHERE tconst = ?`,
          tx.values?.tconst
        );
        break;
      case "UPDATE":
        const columnsToUpdate = [];
        const values = [];
        if (tx.oldValues?.primaryTitle !== undefined) {
          columnsToUpdate.push("primaryTitle = ?");
          values.push(tx.oldValues.primaryTitle);
        }
        if (tx.oldValues?.startYear !== undefined) {
          columnsToUpdate.push("startYear = ?");
          values.push(tx.oldValues.startYear);
        }
        if (tx.oldValues?.runtimeMinutes !== undefined) {
          columnsToUpdate.push("runtimeMinutes = ?");
          values.push(tx.oldValues.runtimeMinutes);
        }
        if (tx.oldValues?.genres !== undefined) {
          columnsToUpdate.push("genres = ?");
          values.push(tx.oldValues.genres);
        }

        values.push(tx.oldValues?.tconst);

        await conn.query(
          `UPDATE ${tableName} SET ${columnsToUpdate.join(
            ", "
          )} WHERE tconst = ?`,
          values
        );
        break;
      case "DELETE":
        await conn.query(
          `INSERT INTO ${tableName}(tconst, primaryTitle, startYear, runtimeMinutes, genres) 
          VALUES(?, ?, ?, ?, ?)`,
          [
            tx.oldValues?.tconst,
            tx.oldValues?.primaryTitle,
            tx.oldValues?.startYear,
            tx.oldValues?.runtimeMinutes,
            tx.oldValues?.genres,
          ]
        );
        break;
    }
  } catch (err) {
    console.error(`Failed to undo ${tx.operation} level`, err);
  } finally {
    if (conn) conn.release();
  }
}
