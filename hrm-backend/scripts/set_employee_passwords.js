/**
 * One-off script to set the same default password for all employees.
 * Run with: node scripts/set_employee_passwords.js
 * Make sure MONGO_URI is set in environment.
 */
const mongoose = require('mongoose');
require('dotenv').config();
// model filename is `Employee.js` (capital E)
const Employee = require('../models/Employee');
const bcrypt = require('bcryptjs');

const DEFAULT_EMPLOYEE_PASSWORD = 'ChangeMe123';

async function main() {
  const origUri = process.env.MONGO_URI;
  if (!origUri) {
    console.error('MONGO_URI not set in environment');
    process.exit(1);
  }

  // try connecting with provided URI, if SRV lookup fails try adding a trailing dot
  async function tryConnect(uri) {
    try {
      await mongoose.connect(uri);
      console.log('Connected to MongoDB');
      return true;
    } catch (err) {
      console.error('Connection attempt failed:', err && err.message);
      throw err;
    }
  }

  try {
    await tryConnect(origUri);
  } catch (err) {
    // handle SRV lookup DNS error by trying FQDN (add trailing dot after host)
    const isSrv = origUri && origUri.startsWith('mongodb+srv://');
    const isSrvErr = err && (err.code === 'ENOTFOUND' || (err.message && err.message.includes('querySrv')));
    if (isSrv && isSrvErr) {
      try {
        console.log('SRV lookup failed; attempting with trailing dot to force FQDN...');
        // split at '@' to separate credentials from host/path
        const atIndex = origUri.indexOf('@');
        if (atIndex === -1) throw err;
        const prefix = origUri.slice(0, atIndex + 1); // includes '@'
        const rest = origUri.slice(atIndex + 1); // host.../path?query
        const slashIndex = rest.indexOf('/');
        const hostPortion = slashIndex === -1 ? rest : rest.slice(0, slashIndex);
        const remainder = slashIndex === -1 ? '' : rest.slice(slashIndex);
        const hostWithDot = hostPortion.endsWith('.') ? hostPortion : hostPortion + '.';
        const newUri = prefix + hostWithDot + remainder;
        console.log('Trying URI:', newUri.replace(/(mongodb\+srv:\/\/).*@/,'$1<creds>@'));
        await tryConnect(newUri);
      } catch (err2) {
        console.error('Trailing-dot fallback failed:', err2 && err2.message);
        // final fallback: if user provided a non-SRV URI explicitly, try it
        const nonSrv = process.env.MONGO_NON_SRV;
        if (nonSrv) {
          try {
            console.log('Attempting provided non-SRV MONGO_NON_SRV URI...');
            await tryConnect(nonSrv);
          } catch (err3) {
            console.error('Provided non-SRV URI failed:', err3 && err3.message);
            process.exit(1);
          }
        }
        process.exit(1);
      }
    } else {
      console.error('Unable to connect to MongoDB:', err && err.message);
      process.exit(1);
    }
  }
  const hashedPassword = await bcrypt.hash(DEFAULT_EMPLOYEE_PASSWORD, 10);
  const result = await Employee.updateMany({}, { $set: { password: hashedPassword } });
  console.log('Updated employee passwords:', result.modifiedCount);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
