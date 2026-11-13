import { MongoClient } from 'mongodb';
import { startMongo } from '../tools/mongo-runtime.mjs';
import { assert, save, until } from '../tools/lib.mjs';
import { createCatalogue } from '../portfolio-4-nosql/catalogue.mjs';
const base = 'portfolio-5-distributed-cloud';
const set = await startMongo(true);
const client = new MongoClient(set.getUri(),{serverSelectionTimeoutMS:15000,retryWrites:true});
const directClients = [];
const output = {executed_at:new Date().toISOString(),scope:'Three real mongod processes on one Windows host; not cloud, geographic replication or sharding',events:[]};
function record(event,value){output.events.push({at:new Date().toISOString(),event,value}); console.log(event);}
async function status() {
  const s = await client.db('admin').command({replSetGetStatus:1});
  return s.members.map(m=>({name:m.name,state:m.stateStr,health:m.health}));
}
try {
  await client.connect();
  output.version = (await client.db('admin').command({buildInfo:1})).version;
  const db = client.db('library_portfolio');
  await createCatalogue(db);
  const books = db.collection('catalogue');
  await books.updateOne({_id:1},{$set:{replicationMarker:'before-failover'}},{writeConcern:{w:'majority',j:true,wtimeoutMS:10000}});
  await until(async()=> (await status()).filter(m=>m.state==='SECONDARY').length===2,'two healthy secondaries',60000);
  record('initial replica set',await status());
  const hello = await client.db('admin').command({hello:1});
  output.original_primary = hello.primary;
  for(const member of hello.hosts) {
    const direct = new MongoClient(`mongodb://${member}/?directConnection=true`,{readPreference:'secondaryPreferred',serverSelectionTimeoutMS:2000});
    directClients.push(direct); await direct.connect();
    await until(async()=> (await direct.db('library_portfolio').collection('catalogue').findOne({_id:1}))?.replicationMarker==='before-failover',`replication to ${member}`);
    record('member contains majority-written marker',{member,document:await direct.db('library_portfolio').collection('catalogue').findOne({_id:1})});
  }
  const oldPrimary = set.servers.find(s=>hello.primary.endsWith(`:${s.instanceInfo.port}`));
  assert.ok(oldPrimary);
  const start = Date.now();
  await oldPrimary.stop({doCleanup:false});
  record('stopped original primary process',{member:hello.primary});
  const next = await until(async()=>{
    try {const h=await client.db('admin').command({hello:1}); return h.isWritablePrimary && h.primary!==hello.primary ? h : false;} catch {return false;}
  },'automatic election after process stop',60000);
  output.new_primary=next.primary; output.observed_recovery_ms=Date.now()-start;
  record('new primary elected',{primary:next.primary,observed_recovery_ms:output.observed_recovery_ms});
  await books.updateOne({_id:1},{$set:{replicationMarker:'after-failover'}},{writeConcern:{w:'majority',j:true,wtimeoutMS:10000}});
  const final = await books.findOne({_id:1},{readConcern:{level:'majority'}});
  assert.equal(final.replicationMarker,'after-failover');
  record('majority write and read succeed after failover',final);
  record('final replica set',await status());
  output.checks={three_members_replicated:true,new_primary_elected:true,majority_write_after_failure:true};
  await save(`${base}/evidence/replication-results.json`,output);
  await save(`${base}/evidence/transcript.txt`,output.events.map(x=>JSON.stringify(x)).join('\n')+'\nPASS: replication and automatic failover\n');
} finally {
  await Promise.allSettled(directClients.map(c=>c.close()));
  await client.close(); await set.stop({doCleanup:false});
}
