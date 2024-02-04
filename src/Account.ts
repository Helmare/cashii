import { Transaction, compare } from "./Transaction.js";

export class Account {
  transactions:Transaction[];
  constructor(transactions:Transaction[] = []) {
    this.transactions = transactions;
  }

  view(start: Date, end: Date) {
    let ts:Transaction[] = [];
    this.transactions.forEach(trans => {
      ts = [...ts, ...trans.expand(start, end)]
    });

    ts = ts.sort(compare);

    let records:AccountRecord[] = [];
    let total = 0;
    ts.forEach(t => {
      total += t.amount
      records.push({
        trans: t,
        amount: total
      });
    });

    return records;
  }
}
export interface AccountRecord {
  trans: Transaction,
  amount: number
};