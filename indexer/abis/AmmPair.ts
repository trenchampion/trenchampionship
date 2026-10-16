export const AmmPairAbi = [
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
    "name": "token",
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
    "name": "tokenSymbol",
    "type": "string",
    "internalType": "string"
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
  "name": "TOKEN",
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
  "name": "addLiquidity",
  "inputs": [
   {
    "name": "tlDesired",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "tokenDesired",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "tlMin",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "tokenMin",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "to",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "tlUsed",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "tokenUsed",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "liquidity",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "allowance",
  "inputs": [
   {
    "name": "owner",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "spender",
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
  "name": "approve",
  "inputs": [
   {
    "name": "spender",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "value",
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
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "balanceOf",
  "inputs": [
   {
    "name": "account",
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
  "name": "decimals",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint8",
    "internalType": "uint8"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "getReserves",
  "inputs": [],
  "outputs": [
   {
    "name": "tl",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "token",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "name",
  "inputs": [],
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
  "name": "quoteLiquidity",
  "inputs": [
   {
    "name": "tlDesired",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "tokenDesired",
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
  "name": "quoteTlForToken",
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
  "name": "quoteTokenForTl",
  "inputs": [
   {
    "name": "tokenIn",
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
  "name": "removeLiquidity",
  "inputs": [
   {
    "name": "liquidity",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "tlMin",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "tokenMin",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "to",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "tlOut",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "tokenOut",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "reserveTl",
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
  "name": "reserveToken",
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
  "name": "swapTlForToken",
  "inputs": [
   {
    "name": "tlIn",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "minTokenOut",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "to",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "tokenOut",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "swapTokenForTl",
  "inputs": [
   {
    "name": "tokenIn",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "minTlOut",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "to",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "tlOut",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "symbol",
  "inputs": [],
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
  "name": "totalSupply",
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
  "name": "transfer",
  "inputs": [
   {
    "name": "to",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "value",
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
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "transferFrom",
  "inputs": [
   {
    "name": "from",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "to",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "value",
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
  "stateMutability": "nonpayable"
 },
 {
  "type": "event",
  "name": "Approval",
  "inputs": [
   {
    "name": "owner",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "spender",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "value",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "LiquidityAdded",
  "inputs": [
   {
    "name": "provider",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "to",
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
    "name": "tokenIn",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "liquidity",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "LiquidityRemoved",
  "inputs": [
   {
    "name": "provider",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "to",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "tlOut",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "tokenOut",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "liquidity",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "ReservesUpdated",
  "inputs": [
   {
    "name": "reserveTl",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "reserveToken",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Swap",
  "inputs": [
   {
    "name": "trader",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "to",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "tlToToken",
    "type": "bool",
    "indexed": false,
    "internalType": "bool"
   },
   {
    "name": "amountIn",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "amountOut",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "protocolFee",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Transfer",
  "inputs": [
   {
    "name": "from",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "to",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "value",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "error",
  "name": "ERC20InsufficientAllowance",
  "inputs": [
   {
    "name": "spender",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "allowance",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "needed",
    "type": "uint256",
    "internalType": "uint256"
   }
  ]
 },
 {
  "type": "error",
  "name": "ERC20InsufficientBalance",
  "inputs": [
   {
    "name": "sender",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "balance",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "needed",
    "type": "uint256",
    "internalType": "uint256"
   }
  ]
 },
 {
  "type": "error",
  "name": "ERC20InvalidApprover",
  "inputs": [
   {
    "name": "approver",
    "type": "address",
    "internalType": "address"
   }
  ]
 },
 {
  "type": "error",
  "name": "ERC20InvalidReceiver",
  "inputs": [
   {
    "name": "receiver",
    "type": "address",
    "internalType": "address"
   }
  ]
 },
 {
  "type": "error",
  "name": "ERC20InvalidSender",
  "inputs": [
   {
    "name": "sender",
    "type": "address",
    "internalType": "address"
   }
  ]
 },
 {
  "type": "error",
  "name": "ERC20InvalidSpender",
  "inputs": [
   {
    "name": "spender",
    "type": "address",
    "internalType": "address"
   }
  ]
 },
 {
  "type": "error",
  "name": "InsufficientLiquidity",
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
  "name": "ZeroAddress",
  "inputs": []
 },
 {
  "type": "error",
  "name": "ZeroAmount",
  "inputs": []
 }
] as const;
