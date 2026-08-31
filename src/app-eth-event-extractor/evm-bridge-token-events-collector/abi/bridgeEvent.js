export default {
  anonymous: false,
  inputs: [
    {
      indexed: true,
      internalType: "address",
      name: "account",
      type: "address",
    },
    {
      indexed: true,
      internalType: "uint256",
      name: "amount",
      type: "uint256",
    },
    {
      indexed: false,
      internalType: "uint256",
      name: "chainIdOrigin",
      type: "uint256",
    },
    {
      indexed: false,
      internalType: "uint256",
      name: "chainIdDestination",
      type: "uint256",
    },
    {
      indexed: false,
      internalType: "address",
      name: "tokenDestination",
      type: "address",
    },
  ],
  name: "Bridge",
  type: "event",
};
