export const escrowAbi = [
  {
    type: "function",
    name: "nextAgreementId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }]
  },
  {
    type: "function",
    name: "agreements",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "id", type: "uint256" },
      { name: "client", type: "address" },
      { name: "freelancer", type: "address" },
      { name: "usdc", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "metadataHash", type: "string" },
      { name: "deliveryHash", type: "string" },
      { name: "deadline", type: "uint256" },
      { name: "deliveredAt", type: "uint256" },
      { name: "state", type: "uint8" },
      { name: "counterSigned", type: "bool" }
    ]
  },
  {
    type: "function",
    name: "createAgreement",
    stateMutability: "nonpayable",
    inputs: [
      { name: "freelancer", type: "address" },
      { name: "usdc", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "metadataHash", type: "string" },
      { name: "deadline", type: "uint256" }
    ],
    outputs: [{ name: "id", type: "uint256" }]
  },
  {
    type: "function",
    name: "counterSign",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "signature", type: "bytes" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "fund",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "markDelivered",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "deliveryHash", type: "string" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "approveAndRelease",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "raiseDispute",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "clientRefund",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: []
  }
] as const;

export const erc20Abi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ type: "bool" }]
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }]
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ type: "uint256" }]
  }
] as const;
