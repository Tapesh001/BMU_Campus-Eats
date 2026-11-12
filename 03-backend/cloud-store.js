const { MongoClient } = require('mongodb');
module.exports = async function connectStore() {
  if (!process.env.MONGODB_URI && !process.env.BMU_MONGO_PASSWORD) return null;
  const uri = process.env.MONGODB_URI || 'mongodb+srv://' + encodeURIComponent(process.env.BMU_MONGO_USER) + ':' + encodeURIComponent(process.env.BMU_MONGO_PASSWORD) + '@' + process.env.BMU_MONGO_HOST + '/';
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000, socketTimeoutMS: 15000 });
  await client.connect();
  const collection = client.db(process.env.BMU_MONGO_DATABASE || 'campus_eats').collection('app_state');
  const versions = new Map();
  return {
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
