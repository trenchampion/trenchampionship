export const RatingAbi = [
 {
  "type": "constructor",
  "inputs": [
   {
    "name": "tl",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "matchManager",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "rewardPool",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "nft",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "DEPLOY_TIME",
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
  "name": "MATCH_MANAGER",
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
    "internalType": "contract IControllerNFT"
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
    "internalType": "contract IRewardPool"
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
  "name": "claim",
  "inputs": [],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "claimable",
  "inputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "address"
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
  "name": "closeSeason",
  "inputs": [],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "currentSeason",
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
  "name": "eligible",
  "inputs": [
   {
    "name": "season",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "characterId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "bool",
    "internalType": "bool"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "expectedScore",
  "inputs": [
   {
    "name": "diff",
    "type": "int256",
    "internalType": "int256"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "pure"
 },
 {
  "type": "function",
  "name": "lastSeasonTouched",
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
  "name": "license",
  "inputs": [
   {
    "name": "characterId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "licensed",
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
    "type": "bool",
    "internalType": "bool"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "nominate",
  "inputs": [
   {
    "name": "characterId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "ratedMatches",
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
  "name": "ratingOf",
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
    "type": "int256",
    "internalType": "int256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "recordResult",
  "inputs": [
   {
    "name": "idA",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "idB",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "outcome",
    "type": "int8",
    "internalType": "int8"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "seasonClosed",
  "inputs": [
   {
    "name": "season",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "bool",
    "internalType": "bool"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "seasonDistinctOpponents",
  "inputs": [
   {
    "name": "season",
    "type": "uint256",
    "internalType": "uint256"
   },
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
  "name": "seasonEnd",
  "inputs": [
   {
    "name": "season",
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
  "name": "seasonPairMatches",
  "inputs": [
   {
    "name": "season",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "pairKey",
    "type": "bytes32",
    "internalType": "bytes32"
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
  "name": "seasonRatedMatches",
  "inputs": [
   {
    "name": "season",
    "type": "uint256",
    "internalType": "uint256"
   },
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
  "name": "seasonsClosed",
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
  "name": "top",
  "inputs": [
   {
    "name": "season",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "uint256[]",
    "internalType": "uint256[]"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "unlicense",
  "inputs": [
   {
    "name": "characterId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "event",
  "name": "Claimed",
  "inputs": [
   {
    "name": "to",
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
  "name": "Licensed",
  "inputs": [
   {
    "name": "characterId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "by",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "RatingChanged",
  "inputs": [
   {
    "name": "characterId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "season",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "before",
    "type": "int256",
    "indexed": false,
    "internalType": "int256"
   },
   {
    "name": "after_",
    "type": "int256",
    "indexed": false,
    "internalType": "int256"
   },
   {
    "name": "rated",
    "type": "bool",
    "indexed": false,
    "internalType": "bool"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "SeasonClosed",
  "inputs": [
   {
    "name": "season",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "prize",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "top",
    "type": "uint256[]",
    "indexed": false,
    "internalType": "uint256[]"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "SeasonRewardBooked",
  "inputs": [
   {
    "name": "season",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "characterId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
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
  "name": "Unlicensed",
  "inputs": [
   {
    "name": "characterId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "by",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "refunded",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "error",
  "name": "AlreadyLicensed",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotController",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotLicensed",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotMatchManager",
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
  "name": "SeasonAlreadyClosed",
  "inputs": []
 },
 {
  "type": "error",
  "name": "SeasonNotOver",
  "inputs": []
 }
] as const;
