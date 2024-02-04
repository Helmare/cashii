#! /usr/bin/env node
import { load, save } from './cashii.js';
import { program } from 'commander';
import { format, lastDayOfMonth, parse, startOfMonth } from "date-fns";
import { Transaction, Trigger, compare } from "./Transaction.js";
import { ClimtTable } from 'climt';
import { Account, AccountRecord } from './Account.js';
import chalk from 'chalk';

// Currency format.
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

// Transaction table.
const transTable: ClimtTable<Transaction> = new ClimtTable();
transTable.column('ID', (t, i) => i.toString());
transTable.column('Date', t => format(t.date, 'MM/dd/yyyy'));
transTable.column('Memo', 'memo');
transTable.column('Amount', t => currency.format(t.amount));
transTable.column('Trigger', 'trigger');

// Records table.
const recordTable: ClimtTable<AccountRecord> = new ClimtTable();
recordTable.column('Date', r => format(r.trans.date, 'MM/dd/yyyy'));
recordTable.column('Memo', 'trans.memo');
recordTable.column('Amount', r => currency.format(r.trans.amount));
recordTable.column('Total', r => {
  const str = currency.format(r.amount);
  if (r.amount < 0) {
    return chalk.redBright(str);
  }
  else {
    return chalk.greenBright(str);
  }
});
recordTable.format((col, row, content, data) => {
  if (row >= 0 && data.trans.date.getDate() % 2 == 0) {
    return chalk.gray(content);
  }
  else {
    return content;
  }
});

// Load cashii data.
const cashii = await load();
cashii.transactions = cashii.transactions.sort(compare);

const acc = new Account(cashii.transactions);

function transferFn(scalar: number) {
  return async (memo: string, amountStr: string, dateStr: string, trigger: Trigger) => {
    trigger = trigger.toUpperCase() as Trigger;
    if (!Object.values(Trigger).includes(trigger)) {
      trigger = Trigger.ONCE;
    }

    const amount: number = parseFloat(amountStr);
    if (isNaN(amount)) {
      console.log(chalk.redBright(`'${amountStr}' is an invalid transaction amount.`));
      return;
    }

    const date: Date = parse(dateStr, 'MM/dd/yyyy', new Date());
    if (isNaN(date.getTime())) {
      console.log(chalk.redBright(`'${dateStr}' is an invalid transaction date.`));
      return;
    }

    cashii.transactions.push(new Transaction({
      memo, 
      amount: amount * scalar, 
      date: date,
      trigger: trigger
    }));
    await save(cashii);
  }
}

// Basic info.
program
  .name('cashii')
  .description('A CLI budgeting app.')
  .version('0.0.1')
  .option('--debug');

// Transaction manipulation.
program.command('get')
  .argument('<memo>', 'What to call the transaction.')
  .argument('<amount>', 'The amount to transfer.')
  .argument('<date>', 'The date of the first transfer (dd/MM/yyyy)')
  .argument('[trigger]', 'How the transfer is triggered', 'ONCE')
  .action(transferFn(1));
program.command('send')
  .argument('<memo>', 'What to call the transaction.')
  .argument('<amount>', 'The amount to transfer.')
  .argument('<date>', 'The date of the first transfer (dd/MM/yyyy)')
  .argument('[trigger]', 'How the transfer is triggered', 'ONCE')
  .action(transferFn(-1));

program.command('remove')
  .alias('rm')
  .argument('<id>', 'The transaction ID (see list).')
  .action(async (id: string) => {
    cashii.transactions.splice(parseInt(id), 1);
    await save(cashii);
  });

// List command
program.command('list')
  .action(() => transTable.render(cashii.transactions));

// View
program.command("view")
  .action(() => {
    let records:AccountRecord[] = acc.view(startOfMonth(new Date()), lastDayOfMonth(new Date()));
    recordTable.render(records);
  });

// Run program.
program.parse();
if (program.opts().debug) {
  console.log(cashii);
}