export const CharacterPoolAbi = [
 {
  "type": "constructor",
  "inputs": [
   {
    "name": "characterId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "tl",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "nft",
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
   },
   {
    "name": "virtualTl",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "creatorFeeBps",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "CHARACTER_ID",
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
  "name": "CREATOR_FEE_BPS",
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
  "name": "NFT",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "contract IControllerLookup"
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
    "internalType": "contract IERC20"
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
  "name": "VIRTUAL_TL",
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
  "name": "buy",
  "inputs": [
   {
    "name": "tlIn",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "minTokensOut",
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
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "buyFor",
  "inputs": [
   {
    "name": "recipient",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "tlIn",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "minTokensOut",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "out",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "claimCreatorFees",
  "inputs": [],
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
  "name": "controller",
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
  "name": "creatorFeeOwed",
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
  "name": "initialize",
  "inputs": [
   {
    "name": "token_",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "quoteBuy",
  "inputs": [
   {
    "name": "tlIn",
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
  "name": "quoteReserve",
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
  "name": "quoteSell",
  "inputs": [
   {
    "name": "tokensIn",
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
  "name": "realReserve",
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
  "name": "sell",
  "inputs": [
   {
    "name": "tokensIn",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "minTlOut",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "net",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "spotPrice",
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
  "name": "token",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "contract IERC20"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "tokenReserve",
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
  "type": "event",
  "name": "Buy",
  "inputs": [
   {
    "name": "buyer",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "recipient",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "tlIn",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "tokensOut",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "protocolFee",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "creatorFee",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "CreatorFeesClaimed",
  "inputs": [
   {
    "name": "controller",
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
  "name": "Initialized",
  "inputs": [
   {
    "name": "token",
    "type": "address",
    "indexed": false,
    "internalType": "address"
   },
   {
    "name": "tokenReserve",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Sell",
  "inputs": [
   {
    "name": "seller",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "tokensIn",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "tlOut",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "protocolFee",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "creatorFee",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "error",
  "name": "AlreadyInitialized",
  "inputs": []
 },
 {
  "type": "error",
  "name": "InsufficientReserve",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotFactory",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotInitialized",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NothingToClaim",
  "inputs": []
 },
 {
  "type": "error",
  "name": "ReentrancyGuardReentrantCall",
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
  "name": "SlippageExceeded",
  "inputs": []
 },
 {
  "type": "error",
  "name": "ZeroAmount",
  "inputs": []
 }
] as const;
