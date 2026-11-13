import { MongoBinary } from 'mongodb-memory-server-core';
import path from 'node:path';
import { root } from './lib.mjs';
const binary = await MongoBinary.getPath({version:'8.0.17',downloadDir:path.join(root,'.cache','mongodb'),checkMD5:true});
console.log(`MongoDB binary available: ${binary}`);
