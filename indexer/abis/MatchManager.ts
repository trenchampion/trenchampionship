export const MatchManagerAbi = [
 {
  "type": "constructor",
  "inputs": [
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
    "name": "factory",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "rewardPool",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "vault",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "rating",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "treasury",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "tournament",
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
  "name": "FACTORY",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "contract ICharacterRegistry"
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
    "internalType": "contract IRating"
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
  "name": "TOURNAMENT",
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
  "name": "VAULT",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "contract IStakingVault"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "accept",
  "inputs": [
   {
    "name": "matchId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "idB",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "activeCount",
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
  "name": "activePairs",
  "inputs": [
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
  "name": "cancel",
  "inputs": [
   {
    "name": "matchId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "challenge",
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
    "name": "stake",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "preset",
    "type": "uint8",
    "internalType": "uint8"
   }
  ],
  "outputs": [
   {
    "name": "matchId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
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
  "name": "commit",
  "inputs": [
   {
    "name": "matchId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "hash",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "encryptedTactics",
    "type": "bytes",
    "internalType": "bytes"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "commitDeadline",
  "inputs": [
   {
    "name": "matchId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "uint64",
    "internalType": "uint64"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "commitHash",
  "inputs": [
   {
    "name": "matchId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "controller",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "stances",
    "type": "uint8[3]",
    "internalType": "uint8[3]"
   },
   {
    "name": "energies",
    "type": "uint8[3]",
    "internalType": "uint8[3]"
   },
   {
    "name": "salt",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "stateMutability": "pure"
 },
 {
  "type": "function",
  "name": "createTournamentMatch",
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
    "name": "rewardBase",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "matchId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "getMatch",
  "inputs": [
   {
    "name": "matchId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "tuple",
    "internalType": "struct MatchManager.Match",
    "components": [
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
      "name": "controllerA",
      "type": "address",
      "internalType": "address"
     },
     {
      "name": "controllerB",
      "type": "address",
      "internalType": "address"
     },
     {
      "name": "stake",
      "type": "uint256",
      "internalType": "uint256"
     },
     {
      "name": "rewardBase",
      "type": "uint256",
      "internalType": "uint256"
     },
     {
      "name": "preset",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "status",
      "type": "uint8",
      "internalType": "enum MatchManager.Status"
     },
     {
      "name": "outcome",
      "type": "uint8",
      "internalType": "enum MatchManager.Outcome"
     },
     {
      "name": "open",
      "type": "bool",
      "internalType": "bool"
     },
     {
      "name": "tournament",
      "type": "bool",
      "internalType": "bool"
     },
     {
      "name": "revealedA",
      "type": "bool",
      "internalType": "bool"
     },
     {
      "name": "revealedB",
      "type": "bool",
      "internalType": "bool"
     },
     {
      "name": "createdAt",
      "type": "uint64",
      "internalType": "uint64"
     },
     {
      "name": "acceptedAt",
      "type": "uint64",
      "internalType": "uint64"
     },
     {
      "name": "bothCommittedAt",
      "type": "uint64",
      "internalType": "uint64"
     },
     {
      "name": "commitA",
      "type": "bytes32",
      "internalType": "bytes32"
     },
     {
      "name": "commitB",
      "type": "bytes32",
      "internalType": "bytes32"
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
  "name": "lastResolvedAt",
  "inputs": [
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
  "name": "matchCount",
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
  "name": "pairKey",
  "inputs": [
   {
    "name": "a",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "b",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "stateMutability": "pure"
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
  "name": "poke",
  "inputs": [
   {
    "name": "matchId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "presetDuration",
  "inputs": [
   {
    "name": "preset",
    "type": "uint8",
    "internalType": "uint8"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "uint64",
    "internalType": "uint64"
   }
  ],
  "stateMutability": "pure"
 },
 {
  "type": "function",
  "name": "reveal",
  "inputs": [
   {
    "name": "matchId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "tactics",
    "type": "tuple",
    "internalType": "struct BattleEngine.Tactics",
    "components": [
     {
      "name": "stances",
      "type": "uint8[3]",
      "internalType": "uint8[3]"
     },
     {
      "name": "energies",
      "type": "uint8[3]",
      "internalType": "uint8[3]"
     }
    ]
   },
   {
    "name": "salt",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "revealDeadline",
  "inputs": [
   {
    "name": "matchId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "uint64",
    "internalType": "uint64"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "sideCharacter",
  "inputs": [
   {
    "name": "matchId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "side",
    "type": "uint8",
    "internalType": "uint8"
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
  "name": "stakingCloseAt",
  "inputs": [
   {
    "name": "matchId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "uint64",
    "internalType": "uint64"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "stakingOpen",
  "inputs": [
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
  "name": "tacticsOf",
  "inputs": [
   {
    "name": "matchId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "side",
    "type": "uint8",
    "internalType": "uint8"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "tuple",
    "internalType": "struct BattleEngine.Tactics",
    "components": [
     {
      "name": "stances",
      "type": "uint8[3]",
      "internalType": "uint8[3]"
     },
     {
      "name": "energies",
      "type": "uint8[3]",
      "internalType": "uint8[3]"
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
  "type": "event",
  "name": "Accepted",
  "inputs": [
   {
    "name": "matchId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "idB",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "controllerB",
    "type": "address",
    "indexed": false,
    "internalType": "address"
   },
   {
    "name": "stakingCloseAt",
    "type": "uint64",
    "indexed": false,
    "internalType": "uint64"
   },
   {
    "name": "commitDeadline",
    "type": "uint64",
    "indexed": false,
    "internalType": "uint64"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "BattleScores",
  "inputs": [
   {
    "name": "matchId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "scoreA",
    "type": "int16[3]",
    "indexed": false,
    "internalType": "int16[3]"
   },
   {
    "name": "scoreB",
    "type": "int16[3]",
    "indexed": false,
    "internalType": "int16[3]"
   },
   {
    "name": "winners",
    "type": "int8[3]",
    "indexed": false,
    "internalType": "int8[3]"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Cancelled",
  "inputs": [
   {
    "name": "matchId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Challenged",
  "inputs": [
   {
    "name": "matchId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "idA",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "idB",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "controllerA",
    "type": "address",
    "indexed": false,
    "internalType": "address"
   },
   {
    "name": "stake",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "preset",
    "type": "uint8",
    "indexed": false,
    "internalType": "uint8"
   },
   {
    "name": "open",
    "type": "bool",
    "indexed": false,
    "internalType": "bool"
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
  "name": "Committed",
  "inputs": [
   {
    "name": "matchId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "side",
    "type": "uint8",
    "indexed": true,
    "internalType": "uint8"
   },
   {
    "name": "controller",
    "type": "address",
    "indexed": false,
    "internalType": "address"
   },
   {
    "name": "commitHash",
    "type": "bytes32",
    "indexed": false,
    "internalType": "bytes32"
   },
   {
    "name": "encryptedTactics",
    "type": "bytes",
    "indexed": false,
    "internalType": "bytes"
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
  "name": "Resolved",
  "inputs": [
   {
    "name": "matchId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "outcome",
    "type": "uint8",
    "indexed": false,
    "internalType": "enum MatchManager.Outcome"
   },
   {
    "name": "roundsA",
    "type": "uint8",
    "indexed": false,
    "internalType": "uint8"
   },
   {
    "name": "roundsB",
    "type": "uint8",
    "indexed": false,
    "internalType": "uint8"
   },
   {
    "name": "stakerReward",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Revealed",
  "inputs": [
   {
    "name": "matchId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "side",
    "type": "uint8",
    "indexed": true,
    "internalType": "uint8"
   },
   {
    "name": "stances",
    "type": "uint8[3]",
    "indexed": false,
    "internalType": "uint8[3]"
   },
   {
    "name": "energies",
    "type": "uint8[3]",
    "indexed": false,
    "internalType": "uint8[3]"
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
  "name": "AlreadyCommitted",
  "inputs": []
 },
 {
  "type": "error",
  "name": "AlreadyRevealed",
  "inputs": []
 },
 {
  "type": "error",
  "name": "BadOpponent",
  "inputs": []
 },
 {
  "type": "error",
  "name": "BadPreset",
  "inputs": []
 },
 {
  "type": "error",
  "name": "BadReveal",
  "inputs": []
 },
 {
  "type": "error",
  "name": "BadStake",
  "inputs": []
 },
 {
  "type": "error",
  "name": "BadStatus",
  "inputs": []
 },
 {
  "type": "error",
  "name": "Cooldown",
  "inputs": []
 },
 {
  "type": "error",
  "name": "EmptyCommit",
  "inputs": []
 },
 {
  "type": "error",
  "name": "GuardianExpired",
  "inputs": []
 },
 {
  "type": "error",
  "name": "InvalidTactics",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotCommitted",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotController",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotGuardian",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotParticipant",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotTournament",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NothingToClaim",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NothingToDo",
  "inputs": []
 },
 {
  "type": "error",
  "name": "PairBusy",
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
  "name": "TooEarly",
  "inputs": []
 },
 {
  "type": "error",
  "name": "TooLate",
  "inputs": []
 }
] as const;
