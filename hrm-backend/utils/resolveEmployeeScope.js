const mongoose = require('mongoose');
const Employee = require('../models/Employee');

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

// Resolve all employee document ids that should represent the same person for self-service.
// This handles historical duplicate docs where records may point to an older employee _id.
async function resolveEmployeeScopeIds(employeeTokenPayload) {
  const tokenId = employeeTokenPayload?.id;
  const emailFromToken = normalizeEmail(employeeTokenPayload?.email);
  const codeFromToken = employeeTokenPayload?.employeeId || '';

  const byId =
    tokenId && mongoose.Types.ObjectId.isValid(tokenId)
      ? await Employee.findById(tokenId).select('_id email employeeId')
      : null;

  const email = normalizeEmail(byId?.email || emailFromToken);
  const employeeId = byId?.employeeId || codeFromToken;

  const ors = [];
  if (tokenId && mongoose.Types.ObjectId.isValid(tokenId)) {
    ors.push({ _id: tokenId });
  }
  if (email) ors.push({ email });
  if (employeeId) ors.push({ employeeId });

  if (ors.length === 0) return [];

  const matches = await Employee.find({ $or: ors }).select('_id');
  const ids = Array.from(new Set(matches.map((m) => m._id.toString())));
  return ids;
}

async function resolveEmployeeScopeMatchValues(employeeTokenPayload) {
  const ids = await resolveEmployeeScopeIds(employeeTokenPayload);
  const objectIds = ids
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  // Include both ObjectId and raw string forms for legacy records
  // that may have employee references persisted as strings.
  return [...objectIds, ...ids];
}

module.exports = { resolveEmployeeScopeIds, resolveEmployeeScopeMatchValues };
