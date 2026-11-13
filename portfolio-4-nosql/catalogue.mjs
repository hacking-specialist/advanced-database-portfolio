export const catalogue = [
  {_id:1,title:'Database Foundations',authors:[{name:'Ada Example'}],isbn:'9780000000019',publicationYear:2022,
    genres:['Computing'],replacementCostNgn:18000,metadata:{language:'English',format:'print'},copyIds:[1,2]},
  {_id:2,title:'Distributed Data Practice',authors:[{name:'Bola Example'}],isbn:'9780000000026',publicationYear:2023,
    genres:['Computing'],replacementCostNgn:24000,metadata:{language:'English',format:'print'},copyIds:[3,4]},
  {_id:3,title:'Learning SQL',authors:[{name:'Chidi Example'}],isbn:'9780000000033',publicationYear:2021,
    genres:['Computing'],replacementCostNgn:15000,metadata:{language:'English',format:'print'},copyIds:[5,6]},
  {_id:4,title:'Introduction to Research',authors:[{name:'Dara Example'}],isbn:'9780000000040',publicationYear:2020,
    genres:['Research'],replacementCostNgn:12000,metadata:{language:'English',format:'print'},copyIds:[7,8]},
  {_id:5,title:'Digital Libraries',authors:[{name:'Efe Example'}],isbn:'9780000000057',publicationYear:2024,
    genres:['Library Science'],replacementCostNgn:20000,metadata:{language:'English',format:'print'},copyIds:[9,10]}
];
export const validator = {$jsonSchema:{bsonType:'object',required:['_id','title','authors','genres','replacementCostNgn','copyIds'],
  properties:{_id:{bsonType:['int','long','double']},title:{bsonType:'string',minLength:1},
    authors:{bsonType:'array',minItems:1,items:{bsonType:'object',required:['name'],properties:{name:{bsonType:'string',minLength:1}}}},
    genres:{bsonType:'array',minItems:1,items:{bsonType:'string'}},isbn:{bsonType:'string',pattern:'^([0-9]{9}[0-9X]|[0-9]{13})$'},
    replacementCostNgn:{bsonType:['int','long','double','decimal'],minimum:0},
    copyIds:{bsonType:'array',items:{bsonType:['int','long','double']}},metadata:{bsonType:'object'}}}};
export async function createCatalogue(db) {
  await db.createCollection('catalogue',{validator,validationLevel:'strict',validationAction:'error'});
  const books = db.collection('catalogue');
  await books.createIndex({isbn:1},{unique:true,partialFilterExpression:{isbn:{$type:'string'}}});
  await books.createIndex({genres:1,publicationYear:-1});
  await books.insertMany(structuredClone(catalogue));
  return books;
}
export const genrePipeline = [{$unwind:'$genres'},{$group:{_id:'$genres',titles:{$sum:1},
  averageReplacementCostNgn:{$avg:'$replacementCostNgn'}}},{$sort:{_id:1}}];
