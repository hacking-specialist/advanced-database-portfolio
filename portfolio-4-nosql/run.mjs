import { MongoClient } from 'mongodb';
import { startMongo } from '../tools/mongo-runtime.mjs';
import { assert, save } from '../tools/lib.mjs';
import { catalogue, validator, createCatalogue, genrePipeline } from './catalogue.mjs';
const base = 'portfolio-4-nosql';
const server = await startMongo();
const client = new MongoClient(server.getUri(),{serverSelectionTimeoutMS:10000});
try {
  await client.connect();
  const db = client.db('library_portfolio');
  const books = await createCatalogue(db);
  const output = {executed_at:new Date().toISOString(),version:(await db.admin().command({buildInfo:1})).version,
    implementation:'Native mongod, WiredTiger; local standalone test server',operations:[]};
  const found = await books.find({genres:'Computing'}).sort({publicationYear:-1}).toArray();
  assert.equal(found.length,3); output.operations.push({operation:'find Computing titles',result:found});
  const temp = {_id:99,title:'Temporary catalogue entry',authors:[{name:'Test Author'}],genres:['Testing'],replacementCostNgn:100,copyIds:[]};
  await books.insertOne(temp);
  await books.updateOne({_id:99},{$set:{'metadata.language':'English'},$addToSet:{genres:'Research'}});
  const updated = await books.findOne({_id:99}); assert.equal(updated.metadata.language,'English');
  output.operations.push({operation:'insert then atomic update',result:updated});
  assert.equal((await books.deleteOne({_id:99})).deletedCount,1);
  output.operations.push({operation:'delete temporary entry',deletedCount:1});
  let invalidCode, duplicateCode;
  try {await books.insertOne({...temp,replacementCostNgn:-1});} catch(e) {invalidCode=e.code;}
  assert.equal(invalidCode,121);
  try {await books.insertOne({...temp,isbn:catalogue[0].isbn});} catch(e) {duplicateCode=e.code;}
  assert.equal(duplicateCode,11000);
  output.operations.push({operation:'rejected invalid and duplicate documents',validationCode:invalidCode,duplicateCode});
  const genres = await books.aggregate(genrePipeline).toArray();
  assert.equal(genres.find(x=>x._id==='Computing').titles,3);
  assert.equal(genres.find(x=>x._id==='Computing').averageReplacementCostNgn,19000);
  output.operations.push({operation:'genre aggregation',result:genres});
  output.count = await books.countDocuments(); assert.equal(output.count,5);
  output.indexes = await books.indexes();
  await save(`${base}/evidence/results.json`,output);
  await save(`${base}/data/catalogue.json`,catalogue);
  await save(`${base}/data/validator.json`,validator);
  await save(`${base}/evidence/explain.json`,await books.find({genres:'Computing'}).sort({publicationYear:-1}).explain('executionStats'));
  console.log('PASS: MongoDB catalogue, CRUD, validation, unique ISBN and aggregation');
} finally {await client.close(); await server.stop({doCleanup:false});}
