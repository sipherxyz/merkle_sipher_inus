const path = require('path');
const fs = require('fs');
const argv = require('yargs/yargs')(process.argv.slice(2)).argv;
const parseData = require('./merkleDist/parseData').parseData;
const verifyProof = require('./merkleDist/parseData').verifyProof;
const configPath = argv.f;

let data = JSON.parse(fs.readFileSync(path.join(__dirname, configPath), { encoding: 'utf8' }));

json = JSON.stringify(parseData(data), null, 2);
fs.writeFileSync(path.join(__dirname, `merkle_data_sipher.json`), json);
console.log(`Writing merkle data to ./merkle_data_sipher.json`);

console.log(`Verify all proofs in the merkle data:`);
let merkleData = JSON.parse(fs.readFileSync(`merkle_data_sipher.json`), { encoding: 'utf8' });

let randomizedIndex = 1;
const merkleRoot = merkleData.merkleRoot;

merkleData.tokens.forEach((token, index) => {
  const proof = token.proof;
  const tokenData = data.tokens[index];
  const id = index + 1;
  if (!verifyProof(merkleRoot, id, randomizedIndex, tokenData, proof)) {
    console.log('Failed at id: ' + id + '. Abort.');
    process.exit();
  }
});
console.log('All passed successfully.');
