const { MongoClient } = require('mongodb');
async function connectCollection() {
  const { MONGODB_URI, BMU_MONGO_USER, BMU_MONGO_PASSWORD, BMU_MONGO_HOST, BMU_MONGO_DATABASE } = process.env;
  let uri = MONGODB_URI;
  if (!uri) {
    if (!BMU_MONGO_USER || !BMU_MONGO_PASSWORD || !BMU_MONGO_HOST) {
      throw new Error('Set MONGODB_URI before starting the server.');
    }
    const user = encodeURIComponent(BMU_MONGO_USER);
    const password = encodeURIComponent(BMU_MONGO_PASSWORD);
    uri = 'mongodb+srv://' + user + ':' + password + '@' + BMU_MONGO_HOST + '/';
  }
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000, socketTimeoutMS: 15000 });
  await client.connect();
  const hasDatabasePath = /^mongodb(?:\+srv)?:\/\/[^/?]+\/[^/?]+/.test(uri);
  const database = BMU_MONGO_DATABASE || (hasDatabasePath ? client.options.dbName : 'campus_eats');
  const collection = client.db(database).collection('app_state');
  return { client, collection };
}

module.exports = async function connectStore() {
  const { client, collection } = await connectCollection();
  const versions = new Map();
  return {
    close: () => client.close(),
    async load(key, fallback) {
      await collection.updateOne({_id:key}, {$setOnInsert:{value:fallback,revision:0}}, {upsert:true});
      const doc = await collection.findOne({_id:key});
      versions.set(key,doc.revision);
      return doc.value;
    },
    async save(key,value) {
      const revision = versions.get(key);
      const result = await collection.updateOne({_id:key,revision},{$set:{value},$inc:{revision:1}});
      if(result.matchedCount !== 1) throw new Error('Storage conflict; restart service to refresh state.');
      versions.set(key,revision+1);
    }
  };
};

module.exports.connectCollection = connectCollection;
