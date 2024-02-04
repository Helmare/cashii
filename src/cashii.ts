import { homedir } from 'os';
import { Transaction } from "./Transaction.js";
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

export const DEFAULT_PATH = join(homedir(), '.cashii.json');
export interface Cashii {
  transactions: Transaction[]
}
export const DEFAULT_CASHII: Cashii = {
  transactions: []
};

/**
 * Loads a Cashii object from the path in JSON.
 * 
 * @param path 
 * @returns 
 */
export async function load(path?: string): Promise<Cashii> {
  path = path || DEFAULT_PATH;
  if (existsSync(path)) {
    const json: string = await readFile(path, { encoding: 'utf-8' });

    let cashii = JSON.parse(json) as Cashii;
    cashii = { ...DEFAULT_CASHII, ...cashii };

    // Convert ITransaction objs to Transactions.
    let ts: Transaction[] = [];
    cashii.transactions.forEach(t => {
      ts.push(new Transaction(t));
    });
    cashii.transactions = ts;

    return cashii;
  }
  else {
    return DEFAULT_CASHII;
  }
}
/**
 * Saves a Cashii object to the path as JSON.
 * 
 * @param path 
 * @param cashii 
 */
export async function save(cashii: Cashii, path?: string): Promise<void> {
  path = path || DEFAULT_PATH;
  const json = JSON.stringify(cashii);
  await writeFile(path, json, { encoding: 'utf-8' });
}
export const cashii = await load();