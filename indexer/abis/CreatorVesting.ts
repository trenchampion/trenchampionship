export const CreatorVestingAbi = [
 {
  "type": "constructor",
  "inputs": [
   {
    "name": "factory",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "FACTORY",
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
  "name": "releasable",
  "inputs": [
   {
    "name": "characterId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
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
  "name": "release",
  "inputs": [
   {
    "name": "characterId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "amount",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "schedules",
  "inputs": [
   {
    "name": "characterId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "token",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "beneficiary",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "total",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "released",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "start",
    "type": "uint64",
    "internalType": "uint64"
   },
   {
    "name": "duration",
    "type": "uint64",
    "internalType": "uint64"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "setup",
  "inputs": [
   {
    "name": "characterId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "token",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "beneficiary",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "total",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "duration",
    "type": "uint64",
    "internalType": "uint64"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "vested",
  "inputs": [
   {
    "name": "characterId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
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
  "type": "event",
  "name": "Released",
  "inputs": [
   {
    "name": "characterId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "beneficiary",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "amount",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Scheduled",
  "inputs": [
   {
    "name": "characterId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "beneficiary",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "token",
    "type": "address",
    "indexed": false,
    "internalType": "address"
   },
   {
    "name": "total",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "start",
    "type": "uint64",
    "indexed": false,
    "internalType": "uint64"
   },
   {
    "name": "duration",
    "type": "uint64",
    "indexed": false,
    "internalType": "uint64"
   }
  ],
  "anonymous": false
 },
 {
  "type": "error",
  "name": "AlreadySet",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotFactory",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NothingToRelease",
  "inputs": []
 },
 {
  "type": "error",
  "name": "SafeERC20FailedOperation",
  "inputs": [
   {
    "name": "token",
    "type": "address",
    "internalType": "address"
   }
  ]
 },
 {
  "type": "error",
  "name": "ZeroAddress",
  "inputs": []
 }
] as const;
