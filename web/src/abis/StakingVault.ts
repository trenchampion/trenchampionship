export const StakingVaultAbi = [
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
    "name": "factory",
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
  "name": "MATCH_MANAGER",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "contract IMatchManagerViews"
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
  "name": "onResolved",
  "inputs": [
   {
    "name": "matchId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "winnerSide",
    "type": "uint8",
    "internalType": "uint8"
   },
   {
    "name": "reward",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
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
  "name": "pendingReward",
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
   },
   {
    "name": "staker",
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
  "name": "resolutions",
  "inputs": [
   {
    "name": "matchId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "resolved",
    "type": "bool",
    "internalType": "bool"
   },
   {
    "name": "winnerSide",
    "type": "uint8",
    "internalType": "uint8"
   },
   {
    "name": "reward",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "rewardClaimed",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "winnerStakeRemaining",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "stake",
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
   },
   {
    "name": "amount",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "stakes",
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
   },
   {
    "name": "staker",
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
  "name": "sweepDust",
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
  "name": "totalStaked",
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
  "name": "unpause",
  "inputs": [],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "withdraw",
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
  "type": "event",
  "name": "DustSwept",
  "inputs": [
   {
    "name": "matchId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
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
    "name": "winnerSide",
    "type": "uint8",
    "indexed": false,
    "internalType": "uint8"
   },
   {
    "name": "reward",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Staked",
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
    "name": "staker",
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
  "type": "event",
  "name": "Withdrawn",
  "inputs": [
   {
    "name": "matchId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "staker",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "stake",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "reward",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "error",
  "name": "AlreadyResolved",
  "inputs": []
 },
 {
  "type": "error",
  "name": "BadSide",
  "inputs": []
 },
 {
  "type": "error",
  "name": "ControllerCannotStake",
  "inputs": []
 },
 {
  "type": "error",
  "name": "GuardianExpired",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NoStakers",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotGuardian",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotMatchManager",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotResolved",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NothingToSweep",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NothingToWithdraw",
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
  "name": "StakingClosed",
  "inputs": []
 },
 {
  "type": "error",
  "name": "ZeroAmount",
  "inputs": []
 }
] as const;
