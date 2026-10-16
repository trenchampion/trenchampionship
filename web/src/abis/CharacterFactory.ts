export const CharacterFactoryAbi = [
 {
  "type": "constructor",
  "inputs": [
   {
    "name": "tl",
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
    "name": "guardian",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "DEPLOYER",
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
  "name": "GUARDIAN",
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
  "name": "bind",
  "inputs": [
   {
    "name": "nft_",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "vesting_",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "characterCount",
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
  "name": "createCharacter",
  "inputs": [
   {
    "name": "traits",
    "type": "tuple",
    "internalType": "struct BattleEngine.Traits",
    "components": [
     {
      "name": "strength",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "defense",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "speed",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "focus",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "element",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "special",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "weakness",
      "type": "uint8",
      "internalType": "uint8"
     }
    ]
   },
   {
    "name": "metadataURI_",
    "type": "string",
    "internalType": "string"
   },
   {
    "name": "tk",
    "type": "tuple",
    "internalType": "struct CharacterFactory.Tokenomics",
    "components": [
     {
      "name": "name",
      "type": "string",
      "internalType": "string"
     },
     {
      "name": "symbol",
      "type": "string",
      "internalType": "string"
     },
     {
      "name": "supply",
      "type": "uint256",
      "internalType": "uint256"
     },
     {
      "name": "virtualTl",
      "type": "uint256",
      "internalType": "uint256"
     },
     {
      "name": "creatorAllocBps",
      "type": "uint16",
      "internalType": "uint16"
     },
     {
      "name": "vestingDuration",
      "type": "uint32",
      "internalType": "uint32"
     },
     {
      "name": "creatorFeeBps",
      "type": "uint16",
      "internalType": "uint16"
     }
    ]
   },
   {
    "name": "creatorBuyTl",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "minCreatorTokens",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "characterId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "creatorOf",
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
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "exists",
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
  "name": "isPaused",
  "inputs": [],
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
  "name": "metadataURI",
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
    "type": "string",
    "internalType": "string"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "nft",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "contract ControllerNFT"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "pause",
  "inputs": [],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "paused",
  "inputs": [],
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
  "name": "poolOf",
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
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "tokenOf",
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
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "traitsOf",
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
    "type": "tuple",
    "internalType": "struct BattleEngine.Traits",
    "components": [
     {
      "name": "strength",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "defense",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "speed",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "focus",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "element",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "special",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "weakness",
      "type": "uint8",
      "internalType": "uint8"
     }
    ]
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "unpause",
  "inputs": [],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "validTokenomics",
  "inputs": [
   {
    "name": "tk",
    "type": "tuple",
    "internalType": "struct CharacterFactory.Tokenomics",
    "components": [
     {
      "name": "name",
      "type": "string",
      "internalType": "string"
     },
     {
      "name": "symbol",
      "type": "string",
      "internalType": "string"
     },
     {
      "name": "supply",
      "type": "uint256",
      "internalType": "uint256"
     },
     {
      "name": "virtualTl",
      "type": "uint256",
      "internalType": "uint256"
     },
     {
      "name": "creatorAllocBps",
      "type": "uint16",
      "internalType": "uint16"
     },
     {
      "name": "vestingDuration",
      "type": "uint32",
      "internalType": "uint32"
     },
     {
      "name": "creatorFeeBps",
      "type": "uint16",
      "internalType": "uint16"
     }
    ]
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "bool",
    "internalType": "bool"
   }
  ],
  "stateMutability": "pure"
 },
 {
  "type": "function",
  "name": "vesting",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "contract CreatorVesting"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "event",
  "name": "CharacterCreated",
  "inputs": [
   {
    "name": "characterId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "creator",
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
    "name": "pool",
    "type": "address",
    "indexed": false,
    "internalType": "address"
   },
   {
    "name": "metadataURI",
    "type": "string",
    "indexed": false,
    "internalType": "string"
   },
   {
    "name": "traits",
    "type": "tuple",
    "indexed": false,
    "internalType": "struct BattleEngine.Traits",
    "components": [
     {
      "name": "strength",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "defense",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "speed",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "focus",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "element",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "special",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "weakness",
      "type": "uint8",
      "internalType": "uint8"
     }
    ]
   },
   {
    "name": "tokenomics",
    "type": "tuple",
    "indexed": false,
    "internalType": "struct CharacterFactory.Tokenomics",
    "components": [
     {
      "name": "name",
      "type": "string",
      "internalType": "string"
     },
     {
      "name": "symbol",
      "type": "string",
      "internalType": "string"
     },
     {
      "name": "supply",
      "type": "uint256",
      "internalType": "uint256"
     },
     {
      "name": "virtualTl",
      "type": "uint256",
      "internalType": "uint256"
     },
     {
      "name": "creatorAllocBps",
      "type": "uint16",
      "internalType": "uint16"
     },
     {
      "name": "vestingDuration",
      "type": "uint32",
      "internalType": "uint32"
     },
     {
      "name": "creatorFeeBps",
      "type": "uint16",
      "internalType": "uint16"
     }
    ]
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "PausedBy",
  "inputs": [
   {
    "name": "guardian",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "UnpausedBy",
  "inputs": [
   {
    "name": "guardian",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   }
  ],
  "anonymous": false
 },
 {
  "type": "error",
  "name": "AlreadyBound",
  "inputs": []
 },
 {
  "type": "error",
  "name": "EmptyMetadata",
  "inputs": []
 },
 {
  "type": "error",
  "name": "GuardianExpired",
  "inputs": []
 },
 {
  "type": "error",
  "name": "InvalidSpecial",
  "inputs": []
 },
 {
  "type": "error",
  "name": "InvalidTokenomics",
  "inputs": []
 },
 {
  "type": "error",
  "name": "InvalidTraits",
  "inputs": []
 },
 {
  "type": "error",
  "name": "MetadataTooLong",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotBound",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotDeployer",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotGuardian",
  "inputs": []
 },
 {
  "type": "error",
  "name": "Paused",
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
  "name": "ZeroAddress",
  "inputs": []
 }
] as const;
