export const LaunchPoolAbi = [
 {
  "type": "constructor",
  "inputs": [
   {
    "name": "tl",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "payable"
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
  "name": "buy",
  "inputs": [
   {
    "name": "minTlOut",
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
  "stateMutability": "payable"
 },
 {
  "type": "function",
  "name": "capActive",
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
  "name": "capAllowance",
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
  "name": "cappedInflow",
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
  "name": "quoteBuy",
  "inputs": [
   {
    "name": "ethIn",
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
    "name": "tlIn",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "minEthOut",
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
    "name": "ethIn",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "tlOut",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "FounderBuy",
  "inputs": [
   {
    "name": "founder",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "ethIn",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "tlOut",
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
    "name": "tlIn",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "ethOut",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "error",
  "name": "ExceedsInflowCap",
  "inputs": []
 },
 {
  "type": "error",
  "name": "ExceedsPerTxMax",
  "inputs": []
 },
 {
  "type": "error",
  "name": "FailedCall",
  "inputs": []
 },
 {
  "type": "error",
  "name": "InsufficientBalance",
  "inputs": [
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
  "name": "InsufficientReserve",
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
  "name": "UnexpectedBalance",
  "inputs": []
 },
 {
  "type": "error",
  "name": "ZeroAmount",
  "inputs": []
 }
] as const;
