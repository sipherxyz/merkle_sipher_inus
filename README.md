# Sipher NFT data merkle tree generation

## Why is merkle tree of NFT data needed
Sipher NFT sale comes into mind of the team with a few following key characteristics:

1. The team wants the NFTs to be as flexible as possible while remaining its decentralization.
1. Out of 10k NFTs in sale, there are a certain number of high quality (rare) NFTs and the team doesn't want people to have any insights during the sale that influence their decision to buy.
1. The team doesn't want themselves to have any advantages over the others.
1. The team wants to save as much gas as possible for everyone.
In order to achieve the first characteristic, the team decided to host all of the NFT assets including photos, attributes, names and origins on their servers instead of ipfs and setup a merkle tree over the whole NFT data so everyone always has a way to verify their NFTs' integrity.
In order to achieve the other characteristics, it is key to do the sale in a form of "lootbox" sale and noone has the control over "lootbox randomness" in a gas efficient way. The problem here is how everyone can open their "lootbox" without doing all of the txs. It is ideal if the team can do it for them all at once. The mechanism will be discussed in detail in the following **Sale mechanism** section.

### Sale mechanism

To better understand how the merkle tree plays its role in the Sipher sale, lets go through the whole Sipher NFT public sale flow.
1. The team will deploy the `Sale` smartcontract, before anything is allowed to happen (sale for the team, sale for whitelisted participants, sale for the public), the team is required to submit the merkle root to `Sale` smartcontract.
1. Once the merkle root is set and the sale start time kicks in, the team is allowed to buy up to 500 NFTs with price of 0 while the other whitelisted addresses are allowed to buy at most 1 NFT each at the price of 0.1 ETH.
1. After the public sale time kicks in, everyone can buy up to 5 NFTs (if someone has already bought 1 in the previous sale period, he can only buy up to 4) until all of 10K NFTs are sole.
1. After the public sale ends, the team is allowed to do a transaction in order to roll `randomizedStartIndex`, which is a key factor to all NFTs' randomness. At this point, all of the "lootbox" are opened or technically mapped to real NFT data in Sipher server with the following rule: `yourNFTIdInSipherServer = (yourNFTId + randomizedStartIndex - 2) % 10000 + 1`.

Looking at the sale flow, sharp readers will realize a few things:
1. Everyone will be given their NFT ids even before the real NFTs are open. This is important for NFT holders because the NFT id is the essential part they will have to verify.
2. Before `randomizedStartIndex` is randomly set, the mapping between `yourNFTIdInSipherServer` and `yourNFTId` is not established.
3. The team will by 500 NFTs with Ids from 1 to 500. However, they can't control what's rare there because they don't know the mapping.
4. All of the NFT data are stored on Sipher servers except the NFT Ids, this comes with a trust assumption, NFT buyers trust Sipher servers to return **correct** data for the NFT they bought. It is very hard and costly to both achieve *true decentralization* and *flexibility* for a NFT game so the team chose a middle solution that buyers can verify the NFT data, noone can decline the verification result, and at the same time trust that the team will do their best to deliver the correct data. **How do buyers verify the NFT data?** The merkle tree comes in to facilitate such verifications.
5. The merkle root is required to pushed before the sale can start, this means the team has to finalize the NFT data ***before the sale*** and they ***can't modify the data afterward***.

## What is this repo
This reposistory provides a tool **for the team** to calculate the NFT data's merkle root as well as **for NFT holders** to verify their NFT data.

### Merkle tree construction
Merkle tree in this repo is constructed in the same way with [merkle tree js library](https://github.com/miguelmota/merkletreejs) with the following hash function:
```js
const leaves = data.tokens.map((token) => {
  return hashOneToken(token);
})

const tree = new MerkleTree(leaves, keccak256, {sort: true});
```
Where `hashOneToken` is a function to hash 1 NFT data as the following pseudo-code:
```
id = Id in Sipher server of the NFT.
attributeNames = All of the NFT's attribute names sorted alphabetically.
attributeValues = All of the attribute values, in the corresponding order to attributeNames.
mainPhotoMD5 = MD5 of the main photo.
emotions = All of the NFT's emotions sorted alphabetically.
emotionMD5s = All of the MD5 of NFT's emotion photos, in corresponding order to emotions.
name = Name of the NFT.
origin = Origin of the NFT.

return hash = keccak256(abiEncode(
  id, attributeNames, attributeValues, mainPhotoMD5,
  emotions, emotionMD5, name, origin
))
```

### How to run the tool

#### To Sipher team
In order to calculate merkle root and proofs for all NFT data.

1. set your current directory to the root directory of the repo.
1. `npm install` to install all of the dependencies.
1. `node generateMerkleRoot.js -f [path_to_final_data]` to calculate the merkle tree and write the output to `merkle_data_sipher.json` in the current directory. You can find `merkleRoot` as well as all of the proofs for each NFT. The `merkleRoot` is used to push to `Sale` contract.

#### To NFT holders
In order to verify if your NFT data is correct manually.

1. Query on NFT contract to get your `id` and the `randomizedStartIndex`.
1. Download all of the photos related to your NFT including main photo, emotion photos and get MD5 of them.
1. Get all of the necessary NFT's data from Sipher servers using your NFT's `tokenUri(id)` function. Verify your computed MD5s in step #2 to see if they match with what returned from Sipher servers. If they don't, the data is not correct, you should ask the team.
1. Get `merkleRoot` from `Sale` contract.
1. Get `proofs` from Sipher server.
1. Use this `const verifyProof = require('./merkleDist/parseData').verifyProof;` function to run merkle proof verification. If it returns `True`, the data is fine, otherwise it is not.

Note: *The team will work on an automatic tool to do all of those steps just with 1 click in the future to save all of the effort.* However, it is still important for every NFT holders to understand how they can do it without relying on Sipher team.
