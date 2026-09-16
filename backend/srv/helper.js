const cds = require('@sap/cds');

const ID_PREFIXES = {
  CANDIDATE: 'CAND',
  APPLICATION: 'APP',
  JOB: 'JOB',
  EMPLOYEE: 'EMP'
};

async function generateNextId(tx, type) {
  const { Counter } = cds.entities('ta.master');
  const prefix = ID_PREFIXES[type];

  let counter = await tx.run(
    SELECT.one.from(Counter).where({ type }).forUpdate()
  );

  if (!counter) {
    await tx.run(
      INSERT.into(Counter).entries({ type, lastNumber: 0 })
    );
    counter = { lastNumber: 0 };
  }

  const lastNumber = counter.lastNumber ?? 0;
  const latestNumber = lastNumber + 1;

  await tx.run(
    UPDATE(Counter)
      .set({ lastNumber: latestNumber })
      .where({ type })
  );

  const paddedNumber = String(latestNumber).padStart(5, '0');
  return `${prefix}${paddedNumber}`;
}

module.exports = { generateNextId };