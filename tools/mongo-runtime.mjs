import { MongoMemoryServer, MongoMemoryReplSet } from 'mongodb-memory-server-core';
import { mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { root } from './lib.mjs';
const binary = {version:'8.0.17',downloadDir:path.join(root,'.cache','mongodb'),checkMD5:true};
export async function startMongo(replica = false) {
  const dir = path.join(root,'.runs',`mongo-${randomUUID()}`);
  await mkdir(dir,{recursive:true});
  if (!replica) {
    return MongoMemoryServer.create({binary,instance:{dbPath:dir,ip:'127.0.0.1',storageEngine:'wiredTiger',
      args:['--wiredTigerCacheSizeGB','0.25']},spawn:{windowsHide:true}});
  }
  const instanceOpts = [];
  for(let i=0;i<3;i++) {
    const dbPath = path.join(dir,`member-${i}`); await mkdir(dbPath,{recursive:true});
    instanceOpts.push({dbPath,args:['--wiredTigerCacheSizeGB','0.25']});
  }
  return MongoMemoryReplSet.create({binary,instanceOpts,replSet:{name:'libraryRs',count:3,ip:'127.0.0.1',
    storageEngine:'wiredTiger',spawn:{windowsHide:true},configSettings:{electionTimeoutMillis:3000}}});
}
