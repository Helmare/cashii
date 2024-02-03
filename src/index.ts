#! /usr/bin/env node
import { load, save } from './cashii.js';
import { program } from 'commander';
import { format, parse } from "date-fns";
import { Transaction, Trigger } from "./Transaction.js";

// Load cashii data.
const cashii = await load();

// Basic info.
program
  .name('cashii')
  .description('A CLI budgeting app.')
  .version('0.1.0');

// Transaction manipulation.
program.command('transfer')
  .argument('<memo>', 'What to call the transaction.')
  .argument('<amount>', 'The amount to transfer.')
  .argument('<date>', 'The date of the first transfer (dd/MM/yyyy)')
  .argument('[trigger]', 'How the transfer is triggered', 'ONCE')
  .action(async (memo: string, amount: string, date: string, trigger: Trigger) => {
    trigger = trigger.toUpperCase() as Trigger;
    if (!Object.values(Trigger).includes(trigger)) {
      trigger = Trigger.ONCE;
    }

    cashii.transactions.push(new Transaction({
      memo, 
      amount: parseFloat(amount), 
      date: parse(date, 'MM/dd/yyyy', new Date()),
      trigger: trigger
    }));
    await save(cashii);
  });

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
    cashii.transactions.forEach((t, i) => {
      console.log(`${i} => ${format(t.date, 'MM/dd/yyyy')} | ${t.memo}: ${t.amount} - ${t.trigger}`);
    });
  });

// Run program.
program.parse();