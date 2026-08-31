export default [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "saleId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "uint32",
        name: "kind",
        type: "uint32",
      },
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amountIn",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amountOut",
        type: "uint256",
      },
    ],
    name: "Buy",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "saleId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "uint32",
        name: "kind",
        type: "uint32",
      },
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint8",
        name: "numberPackage",
        type: "uint8",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Claim",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "saleId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "uint32",
        name: "kind",
        type: "uint32",
      },
    ],
    name: "CloseSale",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "saleId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "uint32",
        name: "kind",
        type: "uint32",
      },
    ],
    name: "CreateSale",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "saleId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "uint32",
        name: "kind",
        type: "uint32",
      },
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "WhitelistedAddress",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "kind",
        type: "uint32",
      },
      {
        components: [
          {
            internalType: "uint32",
            name: "kind",
            type: "uint32",
          },
          {
            internalType: "uint112",
            name: "amountBase",
            type: "uint112",
          },
          {
            internalType: "uint112",
            name: "amountQuote",
            type: "uint112",
          },
          {
            internalType: "uint8",
            name: "numberPackages",
            type: "uint8",
          },
          {
            internalType: "uint32",
            name: "lockoutPeriod",
            type: "uint32",
          },
          {
            internalType: "uint48",
            name: "openingTime",
            type: "uint48",
          },
          {
            internalType: "uint48",
            name: "closingTime",
            type: "uint48",
          },
          {
            internalType: "uint112",
            name: "amountPending",
            type: "uint112",
          },
          {
            internalType: "uint256",
            name: "tokenBaseId",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "tokenQuoteId",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "tokenBase",
            type: "address",
          },
          {
            internalType: "address",
            name: "tokenQuote",
            type: "address",
          },
          {
            internalType: "address payable",
            name: "seller",
            type: "address",
          },
        ],
        internalType: "struct IMarketplaceModel.Sale",
        name: "sale",
        type: "tuple",
      },
    ],
    name: "create",
    outputs: [
      {
        internalType: "uint256",
        name: "saleId",
        type: "uint256",
      },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "kind",
        type: "uint32",
      },
      {
        components: [
          {
            internalType: "uint32",
            name: "kind",
            type: "uint32",
          },
          {
            internalType: "uint112",
            name: "amountBase",
            type: "uint112",
          },
          {
            internalType: "uint112",
            name: "amountQuote",
            type: "uint112",
          },
          {
            internalType: "uint8",
            name: "numberPackages",
            type: "uint8",
          },
          {
            internalType: "uint32",
            name: "lockoutPeriod",
            type: "uint32",
          },
          {
            internalType: "uint48",
            name: "openingTime",
            type: "uint48",
          },
          {
            internalType: "uint48",
            name: "closingTime",
            type: "uint48",
          },
          {
            internalType: "uint112",
            name: "amountPending",
            type: "uint112",
          },
          {
            internalType: "uint256",
            name: "tokenBaseId",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "tokenQuoteId",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "tokenBase",
            type: "address",
          },
          {
            internalType: "address",
            name: "tokenQuote",
            type: "address",
          },
          {
            internalType: "address payable",
            name: "seller",
            type: "address",
          },
        ],
        internalType: "struct IMarketplaceModel.Sale",
        name: "sale",
        type: "tuple",
      },
      {
        internalType: "address",
        name: "buyer",
        type: "address",
      },
    ],
    name: "create",
    outputs: [
      {
        internalType: "uint256",
        name: "saleId",
        type: "uint256",
      },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "kind",
        type: "uint32",
      },
      {
        internalType: "uint256",
        name: "saleId",
        type: "uint256",
      },
    ],
    name: "buy",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "_kind",
        type: "uint32",
      },
      {
        internalType: "uint256",
        name: "_saleId",
        type: "uint256",
      },
      {
        internalType: "uint112",
        name: "_amount",
        type: "uint112",
      },
    ],
    name: "donate",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "_kind",
        type: "uint32",
      },
      {
        internalType: "uint256",
        name: "_saleId",
        type: "uint256",
      },
      {
        internalType: "uint8",
        name: "numberPackage",
        type: "uint8",
      },
    ],
    name: "claim",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "kind",
        type: "uint32",
      },
      {
        internalType: "uint256",
        name: "saleId",
        type: "uint256",
      },
    ],
    name: "cancel",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "kind",
        type: "uint32",
      },
      {
        internalType: "uint256",
        name: "saleId",
        type: "uint256",
      },
    ],
    name: "info",
    outputs: [
      {
        components: [
          {
            internalType: "uint32",
            name: "kind",
            type: "uint32",
          },
          {
            internalType: "uint112",
            name: "amountBase",
            type: "uint112",
          },
          {
            internalType: "uint112",
            name: "amountQuote",
            type: "uint112",
          },
          {
            internalType: "uint8",
            name: "numberPackages",
            type: "uint8",
          },
          {
            internalType: "uint32",
            name: "lockoutPeriod",
            type: "uint32",
          },
          {
            internalType: "uint48",
            name: "openingTime",
            type: "uint48",
          },
          {
            internalType: "uint48",
            name: "closingTime",
            type: "uint48",
          },
          {
            internalType: "uint112",
            name: "amountPending",
            type: "uint112",
          },
          {
            internalType: "uint256",
            name: "tokenBaseId",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "tokenQuoteId",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "tokenBase",
            type: "address",
          },
          {
            internalType: "address",
            name: "tokenQuote",
            type: "address",
          },
          {
            internalType: "address payable",
            name: "seller",
            type: "address",
          },
        ],
        internalType: "struct IMarketplaceModel.Sale",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "_kind",
        type: "uint32",
      },
      {
        internalType: "uint256",
        name: "_saleId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "buyer",
        type: "address",
      },
      {
        internalType: "uint8",
        name: "numberPackage",
        type: "uint8",
      },
    ],
    name: "infoPackage",
    outputs: [
      {
        components: [
          {
            internalType: "uint48",
            name: "lockedUntil",
            type: "uint48",
          },
          {
            internalType: "uint112",
            name: "amount",
            type: "uint112",
          },
          {
            internalType: "bool",
            name: "claimed",
            type: "bool",
          },
        ],
        internalType: "struct IMarketplaceModel.Package",
        name: "package",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "kind",
        type: "uint32",
      },
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "getCreateFees",
    outputs: [
      {
        internalType: "uint112",
        name: "fees",
        type: "uint112",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "kind",
        type: "uint32",
      },
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "getBuyFees",
    outputs: [
      {
        internalType: "uint112",
        name: "fees",
        type: "uint112",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "kind",
        type: "uint32",
      },
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "getClaimFees",
    outputs: [
      {
        internalType: "uint112",
        name: "fees",
        type: "uint112",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];
