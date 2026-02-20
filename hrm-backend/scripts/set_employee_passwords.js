/**
 * One-off script to set a default password for employees that lack one.
 * Run with: node scripts/set_employee_passwords.js
 * Make sure MONGO_URI is set in environment.
 */
const mongoose = require('mongoose');
require('dotenv').config();
const Employee = require('../models/employee');
const bcrypt = require('bcryptjs');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const emps = await Employee.find({ $or: [{ password: { $exists: false } }, { password: null }] });
  console.log('Found', emps.length, 'employees without passwords');
  for (const e of emps) {
    const raw = 'ChangeMe123!';
    e.password = await bcrypt.hash(raw, 10);
    await e.save();
    console.log('Set default password for', e.email);
  }
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
