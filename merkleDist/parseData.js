const {MerkleTree} = require('merkletreejs');
const ethers = require('ethers');
const BN = ethers.BigNumber;
const keccak256 = require('keccak256');
const ethersKeccak = ethers.utils.keccak256;
const abiEncoder = ethers.utils.defaultAbiCoder;
const hexlify = ethers.utils.hexlify;

module.exports.verifyProof = function (root, id, randomizedIndex, token, proof) {
  const storageID = (id + randomizedIndex - 2) % 10000 + 1;
  if (storageID != token.id) {
    console.log("inconsistent ID with: id=" + id + ", randomizedIndex=" + randomizedIndex + ", storageID=" + token.id);
    return false;
  }

  let computedHash = hexlify(hashOneToken(token));
  proof.forEach((proofElement) => {
    let hexProof = hexlify(proofElement);
    if (computedHash <= hexProof) {
      computedHash = hexlify(keccak256(
        computedHash + hexProof.substring(2)
      ));
    } else {
      computedHash = hexlify(keccak256(
        proofElement + computedHash.substring(2)
      ));
    }
  });
  if (hexlify(computedHash) != root) {
    console.log("inconstent root: root computed from proofs is " + hexlify(computedHash) + ", expected root is " + root);
  }
  return hexlify(computedHash) == root;
}

module.exports.parseData = function (data) {
  // verify addresses (check duplicates, invalid) and convert cumulative amounts to BN
  // with account as key

  const leaves = data.tokens.map((token) => {
    return hashOneToken(token);
  })

  const tree = new MerkleTree(leaves, keccak256, {sort: true});

  const tokensWithProof = data.tokens.map((element, index) => {
    element.proof = tree.getHexProof(leaves[index]);
    return element;
  })

  data.merkleRoot = tree.getHexRoot();
  data.tokens = tokensWithProof;

  return data;
};

function normalizeOneToken(token) {
  sortedAttrs = token.attributes.sort((a, b) => {
    if (a.trait_type < b.trait_type) {
      return -1;
    }
    if (a.trait_type > b.trait_type) {
      return 1;
    }
    return 0;
  });

  sortedEmotions = Object.keys(token.emotions).sort();
  return {
    id: BN.from(token.id),
    attributeNames: sortedAttrs.map((e) => { return e.trait_type }),
    attributeValues: sortedAttrs.map((e) => { return e.value }),
    mainPhotoMD5: token.image,
    emotions: sortedEmotions,
    emotionMD5s: sortedEmotions.map((e) => { return token.emotions[e].image }),
    name: token.name,
    origin: token.origin,
  };
}

function hashOneToken(token) {
  const normToken = normalizeOneToken(token);
  return ethersKeccak(
    abiEncoder.encode(
      // [id, attribute_names, attribute_values, main_photo_md5, emotions, emotion_md5s, name, origin]
      ['uint256', 'string[]', 'string[]', 'string', 'string[]', 'string[]', 'string', 'string'],
      [normToken.id, normToken.attributeNames, normToken.attributeValues,
        normToken.mainPhotoMD5, normToken.emotions, normToken.emotionMD5s,
        normToken.name, normToken.origin]
    )
  );
}
