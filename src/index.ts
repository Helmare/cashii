#! /usr/bin/env node
import { load, save } from './cashii.js';
import { program } from 'commander';
import { format, isEqual, lastDayOfMonth, parse, startOfMonth } from "date-fns";
import { Transaction, Trigger, compare } from "./Transaction.js";
import { ClimtTable } from 'climt';
import { Account, AccountRecord } from './Account.js';
import chalk from 'chalk';

// Currency format.
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

// Transaction table.
const transTable: ClimtTable<Transaction> = new ClimtTable();
transTable.column('ID', ({row}) => row.toString());
transTable.column('Date', ({obj}) => format(obj!.date, 'MM/dd/yyyy'));
transTable.column('Memo', 'memo');
transTable.column('Amount', ({obj}) => currency.format(obj!.amount));
transTable.column('Trigger', 'trigger');

// Records table.
const recordTable: ClimtTable<AccountRecord> = new ClimtTable();
recordTable.column('Date', ({obj, data, row}) => {
  if (row > 0 && isEqual(data[row - 1].trans.date, obj!.trans.date)) {
    return '';
  }
  else {
    return format(obj!.trans.date, 'MM/dd/yyyy')
  }
});
recordTable.column('Memo', 'trans.memo', { align: 'right' });
recordTable.column('Amount', ({obj}) => currency.format(obj!.trans.amount), { align: 'right' });
recordTable.column('Total', ({obj}) => currency.format(obj!.amount), { align: 'right' });
recordTable.format(({content, obj, col}) => {
  if (obj == null) {
    return content;
  }
  else if (obj.trans.amount > 0) {
      return chalk.greenBright(content);
  }
  else if (obj.amount < 0) {
    return chalk.redBright(content);
  }
  else return content;
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
  .option('--month, -m <month>', 'The month in view (MM).', (new Date().getMonth() + 1).toString())
  .option('--year, -y <year>', 'The year in view (yyyy).', new Date().getFullYear().toString())
  .action((opts: {M: string, Y: string}) => {
    const month: number = parseInt(opts.M);
    if (isNaN(month) || month <= 0 || month > 12) {
      console.log(chalk.redBright("Invalid month."));
    }
    const year: number = parseInt(opts.Y);
    if (isNaN(year)) {
      console.log(chalk.redBright("Invalid year."));
    }

    const date = new Date();
    date.setMonth(month - 1);
    date.setFullYear(year);

    let records: AccountRecord[] = acc.view(startOfMonth(date), lastDayOfMonth(date));
    recordTable.render(records);
  });

// Run program.
program.parse();
if (program.opts().debug) {
  console.log(cashii);
}