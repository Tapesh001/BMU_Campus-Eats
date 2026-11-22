const fs = require('node:fs');
const path = require('node:path');
const { connectCollection } = require('./cloud-store');

async function importLegacy(directory) {
  if (!directory) throw new Error('Pass the directory containing the previous JSON data.');
  const documents = [];
  for (const key of ['students', 'commerce', 'catalog']) {
    const file = path.join(directory, key + '.json');
    if (!fs.existsSync(file)) continue;
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    const valid = key === 'commerce'
      ? Array.isArray(value?.orders) && value.addresses && value.favourites
      : Array.isArray(value);
    if (!valid) throw new Error('Unexpected data structure in ' + key + '.json');
    documents.push({ _id: key, revision: 0, value });
  }
  if (!documents.length) throw new Error('No legacy files found.');
  const { collection, client } = await connectCollection();
  try {
    await client.withSession(session => session.withTransaction(async () => {
      if (await collection.findOne({}, { session, projection: { _id: 1 } })) {
        throw new Error('Target app_state collection already contains data. Import requires an empty target.');
      }
      await collection.insertMany(documents, { session });
    }));
    console.log('Imported into MongoDB:', documents.map(doc => doc._id).join(', '));
  } finally {
    await client.close();
  }
}

const envFile = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
importLegacy(process.argv[2]).catch(error => {
  // Print actionable input errors without exposing connection strings or user records.
  console.error(error.constructor === Error ? error.message : 'Import failed: ' + error.name);
  process.exitCode = 1;
});
