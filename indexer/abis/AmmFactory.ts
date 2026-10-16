export const AmmFactoryAbi = [
 {
  "type": "constructor",
  "inputs": [
   {
    "name": "tl",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "characterFactory",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "rewardPool",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "treasury",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "CHARACTER_FACTORY",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "contract ITokenLookup"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "REWARD_POOL",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "TL",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "TREASURY",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "allPairs",
  "inputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "allPairsLength",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "createPair",
  "inputs": [
   {
    "name": "token",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "pair",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "pairOf",
  "inputs": [
   {
    "name": "token",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "pair",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "pairOfCharacter",
  "inputs": [
   {
    "name": "characterId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "pair",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "event",
  "name": "PairCreated",
  "inputs": [
   {
    "name": "characterId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "token",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "pair",
    "type": "address",
    "indexed": false,
    "internalType": "address"
   },
   {
    "name": "index",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "error",
  "name": "NotCharacterToken",
  "inputs": []
 },
 {
  "type": "error",
  "name": "PairExists",
  "inputs": []
 },
 {
  "type": "error",
  "name": "ZeroAddress",
  "inputs": []
 }
] as const;
