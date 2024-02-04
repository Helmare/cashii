import { add } from "date-fns";
import { Transaction, compare } from "./Transaction.js";

export class Account {
  transactions:Transaction[];
  constructor(transactions:Transaction[] = []) {
    this.transactions = transactions;
  }

  /**
   * Gets all account records within the date range (inclusive).
   * 
   * @param start Start of the date range.
   * @param end End of the date range.
   * @returns 
   */
  view(start: Date, end: Date): AccountRecord[] {
    let ts:Transaction[] = [];
    this.transactions.forEach(trans => {
      ts = [...ts, ...trans.expand(start, end)]
    });
    ts = ts.sort(compare);

    // Create records.
    let records:AccountRecord[] = [];
    let total: number = this.totalBefore(start);
    ts.forEach(t => {
      total += t.amount
      records.push({
        trans: t,
        amount: total
      });
    });
    return records;
  }
  /**
   * Gets the account total before a specific date.
   * @param date 
   * @returns
   */
  totalBefore(date: Date): number {
    let ts:Transaction[] = [];
    this.transactions.forEach(trans => {
      ts = [...ts, ...trans.expandBefore(date)]
    });

    let total = 0;
    ts.forEach(trans => {
      total += trans.amount;
    });
    return total;
  }
}
export interface AccountRecord {
  trans: Transaction,
  amount: number
};