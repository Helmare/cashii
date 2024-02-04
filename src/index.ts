#! /usr/bin/env node
import { load, save } from './cashii.js';
import { program } from 'commander';
import { format, lastDayOfMonth, parse, startOfMonth } from "date-fns";
import { Transaction, Trigger } from "./Transaction.js";
import { ClimtTable } from 'climt';
import { Account, AccountRecord } from './Account.js';
import chalk from 'chalk';

// Load cashii data.
const cashii = await load();
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
  .version('0.1.0')
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
  .action(() => {
    const table: ClimtTable<Transaction> = new ClimtTable();
    const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

    table.column('ID', (t, i) => i.toString());
    table.column('Date', t => format(t.date, 'MM/dd/yyyy'));
    table.column('Memo', 'memo');
    table.column('Amount', t => currency.format(t.amount));
    table.column('Trigger', 'trigger');
    
    table.render(cashii.transactions);
  });

// View
program.command("view")
  .action(() => {
    let records:AccountRecord[] = acc.view(startOfMonth(new Date()), lastDayOfMonth(new Date()));

    const table: ClimtTable<AccountRecord> = new ClimtTable();
    const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    
    table.column('Date', r => format(r.trans.date, 'MM/dd/yyyy'));
    table.column('Memo', 'trans.memo');
    table.column('Amount', r => currency.format(r.trans.amount));
    table.column('Total', r => {
      const str = currency.format(r.amount);
      if (r.amount < 0) {
        return chalk.redBright(str);
      }
      else {
        return chalk.greenBright(str);
      }
    });
    table.render(records);
  });

// Run program.
program.parse();
if (program.opts().debug) {
  console.log(cashii);
}