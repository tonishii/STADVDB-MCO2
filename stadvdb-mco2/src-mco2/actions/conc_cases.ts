"use server";

export async function case1() {
}

export async function case2() {
  // Node0 writes to a specific data item
  // Node1 and Node2 read the same data item concurrently
}

export async function case3() {
  // Node0 updates a data item and Node1 deletes the same data item concurrently
}