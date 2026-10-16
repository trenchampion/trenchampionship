export const TournamentAbi = [
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
    "name": "nft",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "rating",
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
  "name": "MATCH_MANAGER",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "contract MatchManager"
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
  "name": "RATING",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "contract IRatingView"
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
  "name": "activeTournament",
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
  "name": "advance",
  "inputs": [
   {
    "name": "tournamentId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "cancel",
  "inputs": [
   {
    "name": "tournamentId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
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
  "name": "controllerIn",
  "inputs": [
   {
    "name": "tournamentId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "controller",
    "type": "address",
    "internalType": "address"
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
  "name": "create",
  "inputs": [
   {
    "name": "size",
    "type": "uint8",
    "internalType": "uint8"
   },
   {
    "name": "entry",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "organizerFeeBps",
    "type": "uint16",
    "internalType": "uint16"
   }
  ],
  "outputs": [
   {
    "name": "tournamentId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "getBracket",
  "inputs": [
   {
    "name": "tournamentId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "tuple",
    "internalType": "struct Tournament.Bracket",
    "components": [
     {
      "name": "organizer",
      "type": "address",
      "internalType": "address"
     },
     {
      "name": "size",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "organizerFeeBps",
      "type": "uint16",
      "internalType": "uint16"
     },
     {
      "name": "status",
      "type": "uint8",
      "internalType": "enum Tournament.Status"
     },
     {
      "name": "round",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "createdAt",
      "type": "uint64",
      "internalType": "uint64"
     },
     {
      "name": "entry",
      "type": "uint256",
      "internalType": "uint256"
     },
     {
      "name": "players",
      "type": "uint256[]",
      "internalType": "uint256[]"
     },
     {
      "name": "alive",
      "type": "uint256[]",
      "internalType": "uint256[]"
     },
     {
      "name": "roundMatches",
      "type": "uint256[]",
      "internalType": "uint256[]"
     },
     {
      "name": "semifinalLosers",
      "type": "uint256[]",
      "internalType": "uint256[]"
     },
     {
      "name": "winner",
      "type": "uint256",
      "internalType": "uint256"
     },
     {
      "name": "finalist",
      "type": "uint256",
      "internalType": "uint256"
     }
    ]
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "isBusy",
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
  "name": "pot",
  "inputs": [
   {
    "name": "tournamentId",
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
  "name": "register",
  "inputs": [
   {
    "name": "tournamentId",
    "type": "uint256",
    "internalType": "uint256"
   },
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
  "name": "registered",
  "inputs": [
   {
    "name": "tournamentId",
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
  "name": "replayed",
  "inputs": [
   {
    "name": "tournamentId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "matchId",
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
  "name": "seedRating",
  "inputs": [
   {
    "name": "tournamentId",
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
    "type": "int256",
    "internalType": "int256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "start",
  "inputs": [
   {
    "name": "tournamentId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "tournamentCount",
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
  "name": "unregister",
  "inputs": [
   {
    "name": "tournamentId",
    "type": "uint256",
    "internalType": "uint256"
   },
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
  "name": "Cancelled",
  "inputs": [
   {
    "name": "tournamentId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
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
  "name": "Created",
  "inputs": [
   {
    "name": "tournamentId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "organizer",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "size",
    "type": "uint8",
    "indexed": false,
    "internalType": "uint8"
   },
   {
    "name": "entry",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "organizerFeeBps",
    "type": "uint16",
    "indexed": false,
    "internalType": "uint16"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Finished",
  "inputs": [
   {
    "name": "tournamentId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "winner",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "finalist",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "prizePool",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Registered",
  "inputs": [
   {
    "name": "tournamentId",
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
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Replay",
  "inputs": [
   {
    "name": "tournamentId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "oldMatchId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "newMatchId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "RoundStarted",
  "inputs": [
   {
    "name": "tournamentId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "round",
    "type": "uint8",
    "indexed": false,
    "internalType": "uint8"
   },
   {
    "name": "matchIds",
    "type": "uint256[]",
    "indexed": false,
    "internalType": "uint256[]"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Started",
  "inputs": [
   {
    "name": "tournamentId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "seeded",
    "type": "uint256[]",
    "indexed": false,
    "internalType": "uint256[]"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Unregistered",
  "inputs": [
   {
    "name": "tournamentId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "characterId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "error",
  "name": "AlreadyRegistered",
  "inputs": []
 },
 {
  "type": "error",
  "name": "BadEntry",
  "inputs": []
 },
 {
  "type": "error",
  "name": "BadFee",
  "inputs": []
 },
 {
  "type": "error",
  "name": "BadSize",
  "inputs": []
 },
 {
  "type": "error",
  "name": "BadStatus",
  "inputs": []
 },
 {
  "type": "error",
  "name": "ControllerAlreadyIn",
  "inputs": []
 },
 {
  "type": "error",
  "name": "Full",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotController",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotFull",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotRegistered",
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
  "name": "RegistrationOpen",
  "inputs": []
 },
 {
  "type": "error",
  "name": "RoundNotFinished",
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
 }
] as const;
