import { add, isWithinInterval, isBefore, Duration, parseJSON, compareAsc } from 'date-fns';

export enum Trigger {
  ONCE = 'ONCE', 
  DAILY = 'DAILY', 
  WEEKLY = 'WEEKLY', 
  MONTHLY = 'MONTHLY', 
  YEARLY = 'YEARLY'
}
export interface ITransaction {
  memo?: string;
  amount: number;
  date: Date;
  trigger?: Trigger;
}
export class Transaction implements ITransaction {
  memo: string;
  amount: number;
  date: Date;
  trigger: Trigger = Trigger.ONCE;

  constructor(obj?: ITransaction) {
    if (!obj) return;

    // validate memo.
    if (typeof obj.memo == 'string') {
      this.memo = obj.memo;
    }
    // validate amount.
    if (typeof obj.amount == 'number') {
      this.amount = obj.amount;
    }
    // validate date.
    if (obj.date instanceof Date) {
      this.date = obj.date;
    }
    if (typeof obj.date == 'string') {
      this.date = parseJSON(obj.date);
    }
    // validate trigger.
    if (Object.values(Trigger).includes(obj.trigger!)) {
      this.trigger = obj.trigger!;
    }
  }

  /**
   * Gets all instances of the transaction in the date range, which the transactions will
   * be triggered once.
   * 
   * @param start Start of the date range.
   * @param end End of the date range.
   * @returns All instances inside the date range.
   */
  expand(start: Date, end: Date): Transaction[] {
    if (this.trigger == Trigger.ONCE) {
      return isWithinInterval(this.date, {start, end}) ? [this] : [];
    }
    else {
      let arr: Transaction[] = [];
      let curr: Date = new Date(this.date);
      let interval: Duration = {
        days: this.trigger == Trigger.DAILY ? 1 : 0,
        weeks: this.trigger == Trigger.WEEKLY ? 1 : 0,
        months: this.trigger == Trigger.MONTHLY ? 1 : 0,
        years: this.trigger == Trigger.YEARLY ? 1 : 0
      };

      while (isBefore(curr, end)) {
        if (isWithinInterval(curr, {start, end})) {
          arr.push(this.collapse(curr));
        }
        curr = add(curr, interval);
      }

      return arr;
    }
  }
  /**
   * Clones the transaction into a one time transaction with a new date.
   * @param date new date
   */
  collapse(date: Date): Transaction {
    let clone: Transaction = new Transaction(this);
    clone.date = date;
    clone.trigger = Trigger.ONCE;

    return clone;
  }
}

/**
 * Comparse two transactions for sorting by date ASC, then amount DESC.
 * @param t0 
 * @param t1 
 * @returns 
 */
export function compare(t0: Transaction, t1: Transaction): number {
  let x = compareAsc(t0.date, t1.date);
  if (x != 0) return x;
  
  if (t0.amount < t1.amount) {
    return 1;
  }
  else if (t0.amount > t1.amount) {
    return -1;
  }
  else return 0;
}