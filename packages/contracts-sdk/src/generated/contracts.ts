export const CONTRACTS_SDK_PACKAGE_NAME = "@blockchain-escrow/contracts-sdk";

export const CONTRACT_NAMES = [
  "TokenAllowlist",
  "ArbitratorRegistry",
  "ProtocolConfig",
  "FeeVault",
  "EscrowAgreement",
  "EscrowFactory",
] as const;

export type ContractName = (typeof CONTRACT_NAMES)[number];
export type HexString = `0x${string}`;

export interface ContractArtifact {
  readonly abi: readonly unknown[];
  readonly bytecode: HexString;
  readonly deployedBytecode: HexString;
}

export interface DeploymentManifest {
  readonly chainId: number;
  readonly network: string;
  readonly explorerUrl: string;
  readonly deployedAt: string | null;
  readonly deploymentStartBlock: string | null;
  readonly deployer: HexString | null;
  readonly owner: HexString | null;
  readonly pendingOwner: HexString | null;
  readonly treasury: HexString | null;
  readonly usdcToken: HexString | null;
  readonly protocolFeeBps: number;
  readonly contracts: Partial<Record<ContractName, HexString>>;
}

export const contractArtifacts = {
  "TokenAllowlist": {
    "abi": [
      {
        "type": "constructor",
        "inputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "acceptOwnership",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "allowedTokenAt",
        "inputs": [
          {
            "name": "index",
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
        "name": "allowedTokenCount",
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
        "name": "batchSetTokenAllowed",
        "inputs": [
          {
            "name": "tokens",
            "type": "address[]",
            "internalType": "address[]"
          },
          {
            "name": "statuses",
            "type": "bool[]",
            "internalType": "bool[]"
          }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "getAllowedTokens",
        "inputs": [],
        "outputs": [
          {
            "name": "",
            "type": "address[]",
            "internalType": "address[]"
          }
        ],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "isAllowedToken",
        "inputs": [
          {
            "name": "token",
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
        "name": "owner",
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
        "name": "pendingOwner",
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
        "name": "setTokenAllowed",
        "inputs": [
          {
            "name": "token",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "allowed",
            "type": "bool",
            "internalType": "bool"
          }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "transferOwnership",
        "inputs": [
          {
            "name": "newOwner",
            "type": "address",
            "internalType": "address"
          }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "event",
        "name": "OwnershipTransferStarted",
        "inputs": [
          {
            "name": "previousOwner",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          },
          {
            "name": "newOwner",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          }
        ],
        "anonymous": false
      },
      {
        "type": "event",
        "name": "OwnershipTransferred",
        "inputs": [
          {
            "name": "previousOwner",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          },
          {
            "name": "newOwner",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          }
        ],
        "anonymous": false
      },
      {
        "type": "event",
        "name": "TokenStatusUpdated",
        "inputs": [
          {
            "name": "token",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          },
          {
            "name": "allowed",
            "type": "bool",
            "indexed": true,
            "internalType": "bool"
          }
        ],
        "anonymous": false
      },
      {
        "type": "error",
        "name": "IndexOutOfBounds",
        "inputs": [
          {
            "name": "index",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "length",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      },
      {
        "type": "error",
        "name": "InvalidNewOwner",
        "inputs": [
          {
            "name": "newOwner",
            "type": "address",
            "internalType": "address"
          }
        ]
      },
      {
        "type": "error",
        "name": "LengthMismatch",
        "inputs": [
          {
            "name": "tokensLength",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "statusesLength",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      },
      {
        "type": "error",
        "name": "NoPendingOwner",
        "inputs": []
      },
      {
        "type": "error",
        "name": "StatusUnchanged",
        "inputs": [
          {
            "name": "token",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "allowed",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      },
      {
        "type": "error",
        "name": "Unauthorized",
        "inputs": [
          {
            "name": "caller",
            "type": "address",
            "internalType": "address"
          }
        ]
      },
      {
        "type": "error",
        "name": "ZeroAddressToken",
        "inputs": []
      }
    ],
    "bytecode": "0x6080604052348015600e575f5ffd5b505f80546001600160a01b0319163390811782556040519091907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0908290a361098a8061005a5f395ff3fe608060405234801561000f575f5ffd5b506004361061009b575f3560e01c80638da5cb5b116100635780638da5cb5b146100fe578063979124d314610128578063cbe230c31461013b578063e30c397814610176578063f2fde38b14610189575f5ffd5b8063024ece891461009f57806315f69012146100bd57806322a7d4f1146100d257806379ba5097146100e55780637e14d485146100ed575b5f5ffd5b6100a761019c565b6040516100b49190610742565b60405180910390f35b6100d06100cb3660046107b7565b6101fc565b005b6100d06100e0366004610830565b61023b565b6100d0610302565b6004546040519081526020016100b4565b5f54610110906001600160a01b031681565b6040516001600160a01b0390911681526020016100b4565b61011061013636600461089c565b6103b0565b6101666101493660046108b3565b6001600160a01b03165f9081526002602052604090205460ff1690565b60405190151581526020016100b4565b600154610110906001600160a01b031681565b6100d06101973660046108b3565b61040d565b606060048054806020026020016040519081016040528092919081815260200182805480156101f257602002820191905f5260205f20905b81546001600160a01b031681526001909101906020018083116101d4575b5050505050905090565b5f546001600160a01b0316331461022d5760405163472511eb60e11b81523360048201526024015b60405180910390fd5b61023782826104d4565b5050565b5f546001600160a01b031633146102675760405163472511eb60e11b8152336004820152602401610224565b82818114610292576040516355c5b3e360e11b81526004810182905260248101839052604401610224565b5f5b818110156102fa576102f28686838181106102b1576102b16108d3565b90506020020160208101906102c691906108b3565b8585848181106102d8576102d86108d3565b90506020020160208101906102ed91906108e7565b6104d4565b600101610294565b505050505050565b6001546001600160a01b03168061032c57604051633e31d61b60e11b815260040160405180910390fd5b336001600160a01b038216146103575760405163472511eb60e11b8152336004820152602401610224565b5f80546001600160a01b038381166001600160a01b031980841682178555600180549091169055604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b6004545f908083106103df576040516363a056dd60e01b81526004810184905260248101829052604401610224565b600483815481106103f2576103f26108d3565b5f918252602090912001546001600160a01b03169392505050565b5f546001600160a01b031633146104395760405163472511eb60e11b8152336004820152602401610224565b6001600160a01b038116158061045b57505f546001600160a01b038281169116145b1561048457604051630896d9ad60e41b81526001600160a01b0382166004820152602401610224565b600180546001600160a01b0319166001600160a01b038381169182179092555f8054604051929316917f38d16b8cac22d99fc7c124b9cd0de2d3fa1faef420bfe791d8c362d765e227009190a350565b6001600160a01b0382166104fb576040516314f28f2b60e01b815260040160405180910390fd5b6001600160a01b0382165f9081526002602052604090205460ff168115158115150361054d5760405163d00b89f960e01b81526001600160a01b03841660048201528215156024820152604401610224565b6001600160a01b0383165f908152600260205260409020805460ff191683158015919091179091556105e857600454610587906001610914565b6001600160a01b0384165f818152600360205260408120929092556004805460018101825592527f8a35acfbc15ff81a39ae7d344fd709f28e8600b4aa8c65c6b64bfe7fe36bd19b90910180546001600160a01b0319169091179055610706565b6001600160a01b0383165f908152600360205260408120549061060c60018361092d565b6004549091505f906106209060019061092d565b90508082146106b8575f6004828154811061063d5761063d6108d3565b5f91825260209091200154600480546001600160a01b03909216925082918590811061066b5761066b6108d3565b5f91825260209091200180546001600160a01b0319166001600160a01b039290921691909117905561069e836001610914565b6001600160a01b039091165f908152600360205260409020555b60048054806106c9576106c9610940565b5f828152602080822083015f1990810180546001600160a01b03191690559092019092556001600160a01b03881682526003905260408120555050505b604051821515906001600160a01b038516907fc2af510a9d71a987e12298c8d681a18ee686d181e6fb0bd4166cc01cd7eed4b3905f90a3505050565b602080825282518282018190525f918401906040840190835b818110156107825783516001600160a01b031683526020938401939092019160010161075b565b509095945050505050565b80356001600160a01b03811681146107a3575f5ffd5b919050565b803580151581146107a3575f5ffd5b5f5f604083850312156107c8575f5ffd5b6107d18361078d565b91506107df602084016107a8565b90509250929050565b5f5f83601f8401126107f8575f5ffd5b50813567ffffffffffffffff81111561080f575f5ffd5b6020830191508360208260051b8501011115610829575f5ffd5b9250929050565b5f5f5f5f60408587031215610843575f5ffd5b843567ffffffffffffffff811115610859575f5ffd5b610865878288016107e8565b909550935050602085013567ffffffffffffffff811115610884575f5ffd5b610890878288016107e8565b95989497509550505050565b5f602082840312156108ac575f5ffd5b5035919050565b5f602082840312156108c3575f5ffd5b6108cc8261078d565b9392505050565b634e487b7160e01b5f52603260045260245ffd5b5f602082840312156108f7575f5ffd5b6108cc826107a8565b634e487b7160e01b5f52601160045260245ffd5b8082018082111561092757610927610900565b92915050565b8181038181111561092757610927610900565b634e487b7160e01b5f52603160045260245ffdfea26469706673582212209db42208024f709538516735a95decf6f69723c583c2802a4b6f7ab50c0ff1bd64736f6c634300081c0033",
    "deployedBytecode": "0x608060405234801561000f575f5ffd5b506004361061009b575f3560e01c80638da5cb5b116100635780638da5cb5b146100fe578063979124d314610128578063cbe230c31461013b578063e30c397814610176578063f2fde38b14610189575f5ffd5b8063024ece891461009f57806315f69012146100bd57806322a7d4f1146100d257806379ba5097146100e55780637e14d485146100ed575b5f5ffd5b6100a761019c565b6040516100b49190610742565b60405180910390f35b6100d06100cb3660046107b7565b6101fc565b005b6100d06100e0366004610830565b61023b565b6100d0610302565b6004546040519081526020016100b4565b5f54610110906001600160a01b031681565b6040516001600160a01b0390911681526020016100b4565b61011061013636600461089c565b6103b0565b6101666101493660046108b3565b6001600160a01b03165f9081526002602052604090205460ff1690565b60405190151581526020016100b4565b600154610110906001600160a01b031681565b6100d06101973660046108b3565b61040d565b606060048054806020026020016040519081016040528092919081815260200182805480156101f257602002820191905f5260205f20905b81546001600160a01b031681526001909101906020018083116101d4575b5050505050905090565b5f546001600160a01b0316331461022d5760405163472511eb60e11b81523360048201526024015b60405180910390fd5b61023782826104d4565b5050565b5f546001600160a01b031633146102675760405163472511eb60e11b8152336004820152602401610224565b82818114610292576040516355c5b3e360e11b81526004810182905260248101839052604401610224565b5f5b818110156102fa576102f28686838181106102b1576102b16108d3565b90506020020160208101906102c691906108b3565b8585848181106102d8576102d86108d3565b90506020020160208101906102ed91906108e7565b6104d4565b600101610294565b505050505050565b6001546001600160a01b03168061032c57604051633e31d61b60e11b815260040160405180910390fd5b336001600160a01b038216146103575760405163472511eb60e11b8152336004820152602401610224565b5f80546001600160a01b038381166001600160a01b031980841682178555600180549091169055604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b6004545f908083106103df576040516363a056dd60e01b81526004810184905260248101829052604401610224565b600483815481106103f2576103f26108d3565b5f918252602090912001546001600160a01b03169392505050565b5f546001600160a01b031633146104395760405163472511eb60e11b8152336004820152602401610224565b6001600160a01b038116158061045b57505f546001600160a01b038281169116145b1561048457604051630896d9ad60e41b81526001600160a01b0382166004820152602401610224565b600180546001600160a01b0319166001600160a01b038381169182179092555f8054604051929316917f38d16b8cac22d99fc7c124b9cd0de2d3fa1faef420bfe791d8c362d765e227009190a350565b6001600160a01b0382166104fb576040516314f28f2b60e01b815260040160405180910390fd5b6001600160a01b0382165f9081526002602052604090205460ff168115158115150361054d5760405163d00b89f960e01b81526001600160a01b03841660048201528215156024820152604401610224565b6001600160a01b0383165f908152600260205260409020805460ff191683158015919091179091556105e857600454610587906001610914565b6001600160a01b0384165f818152600360205260408120929092556004805460018101825592527f8a35acfbc15ff81a39ae7d344fd709f28e8600b4aa8c65c6b64bfe7fe36bd19b90910180546001600160a01b0319169091179055610706565b6001600160a01b0383165f908152600360205260408120549061060c60018361092d565b6004549091505f906106209060019061092d565b90508082146106b8575f6004828154811061063d5761063d6108d3565b5f91825260209091200154600480546001600160a01b03909216925082918590811061066b5761066b6108d3565b5f91825260209091200180546001600160a01b0319166001600160a01b039290921691909117905561069e836001610914565b6001600160a01b039091165f908152600360205260409020555b60048054806106c9576106c9610940565b5f828152602080822083015f1990810180546001600160a01b03191690559092019092556001600160a01b03881682526003905260408120555050505b604051821515906001600160a01b038516907fc2af510a9d71a987e12298c8d681a18ee686d181e6fb0bd4166cc01cd7eed4b3905f90a3505050565b602080825282518282018190525f918401906040840190835b818110156107825783516001600160a01b031683526020938401939092019160010161075b565b509095945050505050565b80356001600160a01b03811681146107a3575f5ffd5b919050565b803580151581146107a3575f5ffd5b5f5f604083850312156107c8575f5ffd5b6107d18361078d565b91506107df602084016107a8565b90509250929050565b5f5f83601f8401126107f8575f5ffd5b50813567ffffffffffffffff81111561080f575f5ffd5b6020830191508360208260051b8501011115610829575f5ffd5b9250929050565b5f5f5f5f60408587031215610843575f5ffd5b843567ffffffffffffffff811115610859575f5ffd5b610865878288016107e8565b909550935050602085013567ffffffffffffffff811115610884575f5ffd5b610890878288016107e8565b95989497509550505050565b5f602082840312156108ac575f5ffd5b5035919050565b5f602082840312156108c3575f5ffd5b6108cc8261078d565b9392505050565b634e487b7160e01b5f52603260045260245ffd5b5f602082840312156108f7575f5ffd5b6108cc826107a8565b634e487b7160e01b5f52601160045260245ffd5b8082018082111561092757610927610900565b92915050565b8181038181111561092757610927610900565b634e487b7160e01b5f52603160045260245ffdfea26469706673582212209db42208024f709538516735a95decf6f69723c583c2802a4b6f7ab50c0ff1bd64736f6c634300081c0033"
  },
  "ArbitratorRegistry": {
    "abi": [
      {
        "type": "constructor",
        "inputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "acceptOwnership",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "approvedArbitratorAt",
        "inputs": [
          {
            "name": "index",
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
        "name": "approvedArbitratorCount",
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
        "name": "batchSetArbitratorApproved",
        "inputs": [
          {
            "name": "arbitrators",
            "type": "address[]",
            "internalType": "address[]"
          },
          {
            "name": "statuses",
            "type": "bool[]",
            "internalType": "bool[]"
          }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "getApprovedArbitrators",
        "inputs": [],
        "outputs": [
          {
            "name": "",
            "type": "address[]",
            "internalType": "address[]"
          }
        ],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "isApprovedArbitrator",
        "inputs": [
          {
            "name": "arbitrator",
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
        "name": "owner",
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
        "name": "pendingOwner",
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
        "name": "setArbitratorApproved",
        "inputs": [
          {
            "name": "arbitrator",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "approved",
            "type": "bool",
            "internalType": "bool"
          }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "transferOwnership",
        "inputs": [
          {
            "name": "newOwner",
            "type": "address",
            "internalType": "address"
          }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "event",
        "name": "ArbitratorApprovalUpdated",
        "inputs": [
          {
            "name": "arbitrator",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          },
          {
            "name": "approved",
            "type": "bool",
            "indexed": true,
            "internalType": "bool"
          }
        ],
        "anonymous": false
      },
      {
        "type": "event",
        "name": "OwnershipTransferStarted",
        "inputs": [
          {
            "name": "previousOwner",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          },
          {
            "name": "newOwner",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          }
        ],
        "anonymous": false
      },
      {
        "type": "event",
        "name": "OwnershipTransferred",
        "inputs": [
          {
            "name": "previousOwner",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          },
          {
            "name": "newOwner",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          }
        ],
        "anonymous": false
      },
      {
        "type": "error",
        "name": "ApprovalUnchanged",
        "inputs": [
          {
            "name": "arbitrator",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "approved",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      },
      {
        "type": "error",
        "name": "IndexOutOfBounds",
        "inputs": [
          {
            "name": "index",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "length",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      },
      {
        "type": "error",
        "name": "InvalidNewOwner",
        "inputs": [
          {
            "name": "newOwner",
            "type": "address",
            "internalType": "address"
          }
        ]
      },
      {
        "type": "error",
        "name": "LengthMismatch",
        "inputs": [
          {
            "name": "arbitratorsLength",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "statusesLength",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      },
      {
        "type": "error",
        "name": "NoPendingOwner",
        "inputs": []
      },
      {
        "type": "error",
        "name": "Unauthorized",
        "inputs": [
          {
            "name": "caller",
            "type": "address",
            "internalType": "address"
          }
        ]
      },
      {
        "type": "error",
        "name": "ZeroAddressArbitrator",
        "inputs": []
      }
    ],
    "bytecode": "0x6080604052348015600e575f5ffd5b505f80546001600160a01b0319163390811782556040519091907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0908290a361098a8061005a5f395ff3fe608060405234801561000f575f5ffd5b506004361061009b575f3560e01c8063d44defca11610063578063d44defca14610117578063d4d49b891461012a578063d64bddf81461013b578063e30c397814610176578063f2fde38b14610189575f5ffd5b80631b13c9ea1461009f578063553276a7146100b457806379ba5097146100d25780638cb82d30146100da5780638da5cb5b14610105575b5f5ffd5b6100b26100ad36600461078a565b61019c565b005b6100bc610268565b6040516100c991906107f6565b60405180910390f35b6100b26102c8565b6100ed6100e8366004610841565b610376565b6040516001600160a01b0390911681526020016100c9565b5f546100ed906001600160a01b031681565b6100b2610125366004610882565b6103d3565b6004546040519081526020016100c9565b6101666101493660046108b3565b6001600160a01b03165f9081526002602052604090205460ff1690565b60405190151581526020016100c9565b6001546100ed906001600160a01b031681565b6100b26101973660046108b3565b61040d565b5f546001600160a01b031633146101cd5760405163472511eb60e11b81523360048201526024015b60405180910390fd5b828181146101f8576040516355c5b3e360e11b815260048101829052602481018390526044016101c4565b5f5b8181101561026057610258868683818110610217576102176108d3565b905060200201602081019061022c91906108b3565b85858481811061023e5761023e6108d3565b905060200201602081019061025391906108e7565b6104d4565b6001016101fa565b505050505050565b606060048054806020026020016040519081016040528092919081815260200182805480156102be57602002820191905f5260205f20905b81546001600160a01b031681526001909101906020018083116102a0575b5050505050905090565b6001546001600160a01b0316806102f257604051633e31d61b60e11b815260040160405180910390fd5b336001600160a01b0382161461031d5760405163472511eb60e11b81523360048201526024016101c4565b5f80546001600160a01b038381166001600160a01b031980841682178555600180549091169055604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b6004545f908083106103a5576040516363a056dd60e01b815260048101849052602481018290526044016101c4565b600483815481106103b8576103b86108d3565b5f918252602090912001546001600160a01b03169392505050565b5f546001600160a01b031633146103ff5760405163472511eb60e11b81523360048201526024016101c4565b61040982826104d4565b5050565b5f546001600160a01b031633146104395760405163472511eb60e11b81523360048201526024016101c4565b6001600160a01b038116158061045b57505f546001600160a01b038281169116145b1561048457604051630896d9ad60e41b81526001600160a01b03821660048201526024016101c4565b600180546001600160a01b0319166001600160a01b038381169182179092555f8054604051929316917f38d16b8cac22d99fc7c124b9cd0de2d3fa1faef420bfe791d8c362d765e227009190a350565b6001600160a01b0382166104fb5760405163239192ff60e01b815260040160405180910390fd5b6001600160a01b0382165f9081526002602052604090205460ff168115158115150361054d57604051630148016360e61b81526001600160a01b038416600482015282151560248201526044016101c4565b6001600160a01b0383165f908152600260205260409020805460ff191683158015919091179091556105e857600454610587906001610914565b6001600160a01b0384165f818152600360205260408120929092556004805460018101825592527f8a35acfbc15ff81a39ae7d344fd709f28e8600b4aa8c65c6b64bfe7fe36bd19b90910180546001600160a01b0319169091179055610706565b6001600160a01b0383165f908152600360205260408120549061060c60018361092d565b6004549091505f906106209060019061092d565b90508082146106b8575f6004828154811061063d5761063d6108d3565b5f91825260209091200154600480546001600160a01b03909216925082918590811061066b5761066b6108d3565b5f91825260209091200180546001600160a01b0319166001600160a01b039290921691909117905561069e836001610914565b6001600160a01b039091165f908152600360205260409020555b60048054806106c9576106c9610940565b5f828152602080822083015f1990810180546001600160a01b03191690559092019092556001600160a01b03881682526003905260408120555050505b604051821515906001600160a01b038516907f145224f49b4d54f4470a998c3dae9ee9ea54c4c4db09026fe2bb60595965e6bb905f90a3505050565b5f5f83601f840112610752575f5ffd5b50813567ffffffffffffffff811115610769575f5ffd5b6020830191508360208260051b8501011115610783575f5ffd5b9250929050565b5f5f5f5f6040858703121561079d575f5ffd5b843567ffffffffffffffff8111156107b3575f5ffd5b6107bf87828801610742565b909550935050602085013567ffffffffffffffff8111156107de575f5ffd5b6107ea87828801610742565b95989497509550505050565b602080825282518282018190525f918401906040840190835b818110156108365783516001600160a01b031683526020938401939092019160010161080f565b509095945050505050565b5f60208284031215610851575f5ffd5b5035919050565b80356001600160a01b038116811461086e575f5ffd5b919050565b8035801515811461086e575f5ffd5b5f5f60408385031215610893575f5ffd5b61089c83610858565b91506108aa60208401610873565b90509250929050565b5f602082840312156108c3575f5ffd5b6108cc82610858565b9392505050565b634e487b7160e01b5f52603260045260245ffd5b5f602082840312156108f7575f5ffd5b6108cc82610873565b634e487b7160e01b5f52601160045260245ffd5b8082018082111561092757610927610900565b92915050565b8181038181111561092757610927610900565b634e487b7160e01b5f52603160045260245ffdfea26469706673582212206e90491197b86ede3db2dc34f301c8e4c6faab90944246591d4575bbd6a2a48164736f6c634300081c0033",
    "deployedBytecode": "0x608060405234801561000f575f5ffd5b506004361061009b575f3560e01c8063d44defca11610063578063d44defca14610117578063d4d49b891461012a578063d64bddf81461013b578063e30c397814610176578063f2fde38b14610189575f5ffd5b80631b13c9ea1461009f578063553276a7146100b457806379ba5097146100d25780638cb82d30146100da5780638da5cb5b14610105575b5f5ffd5b6100b26100ad36600461078a565b61019c565b005b6100bc610268565b6040516100c991906107f6565b60405180910390f35b6100b26102c8565b6100ed6100e8366004610841565b610376565b6040516001600160a01b0390911681526020016100c9565b5f546100ed906001600160a01b031681565b6100b2610125366004610882565b6103d3565b6004546040519081526020016100c9565b6101666101493660046108b3565b6001600160a01b03165f9081526002602052604090205460ff1690565b60405190151581526020016100c9565b6001546100ed906001600160a01b031681565b6100b26101973660046108b3565b61040d565b5f546001600160a01b031633146101cd5760405163472511eb60e11b81523360048201526024015b60405180910390fd5b828181146101f8576040516355c5b3e360e11b815260048101829052602481018390526044016101c4565b5f5b8181101561026057610258868683818110610217576102176108d3565b905060200201602081019061022c91906108b3565b85858481811061023e5761023e6108d3565b905060200201602081019061025391906108e7565b6104d4565b6001016101fa565b505050505050565b606060048054806020026020016040519081016040528092919081815260200182805480156102be57602002820191905f5260205f20905b81546001600160a01b031681526001909101906020018083116102a0575b5050505050905090565b6001546001600160a01b0316806102f257604051633e31d61b60e11b815260040160405180910390fd5b336001600160a01b0382161461031d5760405163472511eb60e11b81523360048201526024016101c4565b5f80546001600160a01b038381166001600160a01b031980841682178555600180549091169055604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b6004545f908083106103a5576040516363a056dd60e01b815260048101849052602481018290526044016101c4565b600483815481106103b8576103b86108d3565b5f918252602090912001546001600160a01b03169392505050565b5f546001600160a01b031633146103ff5760405163472511eb60e11b81523360048201526024016101c4565b61040982826104d4565b5050565b5f546001600160a01b031633146104395760405163472511eb60e11b81523360048201526024016101c4565b6001600160a01b038116158061045b57505f546001600160a01b038281169116145b1561048457604051630896d9ad60e41b81526001600160a01b03821660048201526024016101c4565b600180546001600160a01b0319166001600160a01b038381169182179092555f8054604051929316917f38d16b8cac22d99fc7c124b9cd0de2d3fa1faef420bfe791d8c362d765e227009190a350565b6001600160a01b0382166104fb5760405163239192ff60e01b815260040160405180910390fd5b6001600160a01b0382165f9081526002602052604090205460ff168115158115150361054d57604051630148016360e61b81526001600160a01b038416600482015282151560248201526044016101c4565b6001600160a01b0383165f908152600260205260409020805460ff191683158015919091179091556105e857600454610587906001610914565b6001600160a01b0384165f818152600360205260408120929092556004805460018101825592527f8a35acfbc15ff81a39ae7d344fd709f28e8600b4aa8c65c6b64bfe7fe36bd19b90910180546001600160a01b0319169091179055610706565b6001600160a01b0383165f908152600360205260408120549061060c60018361092d565b6004549091505f906106209060019061092d565b90508082146106b8575f6004828154811061063d5761063d6108d3565b5f91825260209091200154600480546001600160a01b03909216925082918590811061066b5761066b6108d3565b5f91825260209091200180546001600160a01b0319166001600160a01b039290921691909117905561069e836001610914565b6001600160a01b039091165f908152600360205260409020555b60048054806106c9576106c9610940565b5f828152602080822083015f1990810180546001600160a01b03191690559092019092556001600160a01b03881682526003905260408120555050505b604051821515906001600160a01b038516907f145224f49b4d54f4470a998c3dae9ee9ea54c4c4db09026fe2bb60595965e6bb905f90a3505050565b5f5f83601f840112610752575f5ffd5b50813567ffffffffffffffff811115610769575f5ffd5b6020830191508360208260051b8501011115610783575f5ffd5b9250929050565b5f5f5f5f6040858703121561079d575f5ffd5b843567ffffffffffffffff8111156107b3575f5ffd5b6107bf87828801610742565b909550935050602085013567ffffffffffffffff8111156107de575f5ffd5b6107ea87828801610742565b95989497509550505050565b602080825282518282018190525f918401906040840190835b818110156108365783516001600160a01b031683526020938401939092019160010161080f565b509095945050505050565b5f60208284031215610851575f5ffd5b5035919050565b80356001600160a01b038116811461086e575f5ffd5b919050565b8035801515811461086e575f5ffd5b5f5f60408385031215610893575f5ffd5b61089c83610858565b91506108aa60208401610873565b90509250929050565b5f602082840312156108c3575f5ffd5b6108cc82610858565b9392505050565b634e487b7160e01b5f52603260045260245ffd5b5f602082840312156108f7575f5ffd5b6108cc82610873565b634e487b7160e01b5f52601160045260245ffd5b8082018082111561092757610927610900565b92915050565b8181038181111561092757610927610900565b634e487b7160e01b5f52603160045260245ffdfea26469706673582212206e90491197b86ede3db2dc34f301c8e4c6faab90944246591d4575bbd6a2a48164736f6c634300081c0033"
  },
  "ProtocolConfig": {
    "abi": [
      {
        "type": "constructor",
        "inputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "MAX_PROTOCOL_FEE_BPS",
        "inputs": [],
        "outputs": [
          {
            "name": "",
            "type": "uint16",
            "internalType": "uint16"
          }
        ],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "acceptOwnership",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "arbitratorRegistry",
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
        "name": "createEscrowPaused",
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
        "name": "feeVault",
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
        "name": "fundingPaused",
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
        "name": "owner",
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
        "name": "pendingOwner",
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
        "name": "protocolFeeBps",
        "inputs": [],
        "outputs": [
          {
            "name": "",
            "type": "uint16",
            "internalType": "uint16"
          }
        ],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "setArbitratorRegistry",
        "inputs": [
          {
            "name": "newArbitratorRegistry",
            "type": "address",
            "internalType": "address"
          }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "setCreateEscrowPaused",
        "inputs": [
          {
            "name": "newCreateEscrowPaused",
            "type": "bool",
            "internalType": "bool"
          }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "setFeeVault",
        "inputs": [
          {
            "name": "newFeeVault",
            "type": "address",
            "internalType": "address"
          }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "setFundingPaused",
        "inputs": [
          {
            "name": "newFundingPaused",
            "type": "bool",
            "internalType": "bool"
          }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "setProtocolFeeBps",
        "inputs": [
          {
            "name": "newProtocolFeeBps",
            "type": "uint16",
            "internalType": "uint16"
          }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "setTokenAllowlist",
        "inputs": [
          {
            "name": "newTokenAllowlist",
            "type": "address",
            "internalType": "address"
          }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "setTreasury",
        "inputs": [
          {
            "name": "newTreasury",
            "type": "address",
            "internalType": "address"
          }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "tokenAllowlist",
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
        "name": "transferOwnership",
        "inputs": [
          {
            "name": "newOwner",
            "type": "address",
            "internalType": "address"
          }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "treasury",
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
        "type": "event",
        "name": "ArbitratorRegistryUpdated",
        "inputs": [
          {
            "name": "previousArbitratorRegistry",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          },
          {
            "name": "newArbitratorRegistry",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          }
        ],
        "anonymous": false
      },
      {
        "type": "event",
        "name": "CreateEscrowPauseUpdated",
        "inputs": [
          {
            "name": "previousPaused",
            "type": "bool",
            "indexed": true,
            "internalType": "bool"
          },
          {
            "name": "newPaused",
            "type": "bool",
            "indexed": true,
            "internalType": "bool"
          }
        ],
        "anonymous": false
      },
      {
        "type": "event",
        "name": "FeeVaultUpdated",
        "inputs": [
          {
            "name": "previousFeeVault",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          },
          {
            "name": "newFeeVault",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          }
        ],
        "anonymous": false
      },
      {
        "type": "event",
        "name": "FundingPauseUpdated",
        "inputs": [
          {
            "name": "previousPaused",
            "type": "bool",
            "indexed": true,
            "internalType": "bool"
          },
          {
            "name": "newPaused",
            "type": "bool",
            "indexed": true,
            "internalType": "bool"
          }
        ],
        "anonymous": false
      },
      {
        "type": "event",
        "name": "OwnershipTransferStarted",
        "inputs": [
          {
            "name": "previousOwner",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          },
          {
            "name": "newOwner",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          }
        ],
        "anonymous": false
      },
      {
        "type": "event",
        "name": "OwnershipTransferred",
        "inputs": [
          {
            "name": "previousOwner",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          },
          {
            "name": "newOwner",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          }
        ],
        "anonymous": false
      },
      {
        "type": "event",
        "name": "ProtocolFeeBpsUpdated",
        "inputs": [
          {
            "name": "previousProtocolFeeBps",
            "type": "uint16",
            "indexed": false,
            "internalType": "uint16"
          },
          {
            "name": "newProtocolFeeBps",
            "type": "uint16",
            "indexed": false,
            "internalType": "uint16"
          }
        ],
        "anonymous": false
      },
      {
        "type": "event",
        "name": "TokenAllowlistUpdated",
        "inputs": [
          {
            "name": "previousTokenAllowlist",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          },
          {
            "name": "newTokenAllowlist",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          }
        ],
        "anonymous": false
      },
      {
        "type": "event",
        "name": "TreasuryUpdated",
        "inputs": [
          {
            "name": "previousTreasury",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          },
          {
            "name": "newTreasury",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          }
        ],
        "anonymous": false
      },
      {
        "type": "error",
        "name": "ArbitratorRegistryUnchanged",
        "inputs": [
          {
            "name": "arbitratorRegistry",
            "type": "address",
            "internalType": "address"
          }
        ]
      },
      {
        "type": "error",
        "name": "CreateEscrowPauseUnchanged",
        "inputs": [
          {
            "name": "paused",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      },
      {
        "type": "error",
        "name": "FeeVaultUnchanged",
        "inputs": [
          {
            "name": "feeVault",
            "type": "address",
            "internalType": "address"
          }
        ]
      },
      {
        "type": "error",
        "name": "FundingPauseUnchanged",
        "inputs": [
          {
            "name": "paused",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      },
      {
        "type": "error",
        "name": "InvalidArbitratorRegistry",
        "inputs": [
          {
            "name": "arbitratorRegistry",
            "type": "address",
            "internalType": "address"
          }
        ]
      },
      {
        "type": "error",
        "name": "InvalidFeeVault",
        "inputs": [
          {
            "name": "feeVault",
            "type": "address",
            "internalType": "address"
          }
        ]
      },
      {
        "type": "error",
        "name": "InvalidNewOwner",
        "inputs": [
          {
            "name": "newOwner",
            "type": "address",
            "internalType": "address"
          }
        ]
      },
      {
        "type": "error",
        "name": "InvalidProtocolFeeBps",
        "inputs": [
          {
            "name": "protocolFeeBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "maxProtocolFeeBps",
            "type": "uint16",
            "internalType": "uint16"
          }
        ]
      },
      {
        "type": "error",
        "name": "InvalidTokenAllowlist",
        "inputs": [
          {
            "name": "tokenAllowlist",
            "type": "address",
            "internalType": "address"
          }
        ]
      },
      {
        "type": "error",
        "name": "InvalidTreasury",
        "inputs": [
          {
            "name": "treasury",
            "type": "address",
            "internalType": "address"
          }
        ]
      },
      {
        "type": "error",
        "name": "NoPendingOwner",
        "inputs": []
      },
      {
        "type": "error",
        "name": "ProtocolFeeBpsUnchanged",
        "inputs": [
          {
            "name": "protocolFeeBps",
            "type": "uint16",
            "internalType": "uint16"
          }
        ]
      },
      {
        "type": "error",
        "name": "TokenAllowlistUnchanged",
        "inputs": [
          {
            "name": "tokenAllowlist",
            "type": "address",
            "internalType": "address"
          }
        ]
      },
      {
        "type": "error",
        "name": "TreasuryUnchanged",
        "inputs": [
          {
            "name": "treasury",
            "type": "address",
            "internalType": "address"
          }
        ]
      },
      {
        "type": "error",
        "name": "Unauthorized",
        "inputs": [
          {
            "name": "caller",
            "type": "address",
            "internalType": "address"
          }
        ]
      }
    ],
    "bytecode": "0x6080604052348015600e575f5ffd5b505f80546001600160a01b0319163390811782556040519091907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0908290a3610ad58061005a5f395ff3fe608060405234801561000f575f5ffd5b506004361061011c575f3560e01c8063a26440cb116100a9578063e30c39781161006e578063e30c397814610259578063e4dd77941461026c578063f0f4426014610280578063f2fde38b14610293578063f624f88a146102a6575f5ffd5b8063a26440cb146101e9578063a591f97f146101fc578063be37b12c1461020f578063d52434f814610222578063e2616c8b14610246575f5ffd5b806361d027b3116100ef57806361d027b3146101a05780636d947e4b146101b357806379ba5097146101bc5780638da5cb5b146101c457806397958c28146101d6575f5ffd5b80632b98deaa1461012057806335659fb8146101355780633fab4a6614610162578063478222c214610175575b5f5ffd5b61013361012e366004610a32565b6102b9565b005b60055461014a90600160a01b900461ffff1681565b60405161ffff90911681526020015b60405180910390f35b610133610170366004610a58565b61036c565b600454610188906001600160a01b031681565b6040516001600160a01b039091168152602001610159565b600554610188906001600160a01b031681565b61014a61271081565b610133610456565b5f54610188906001600160a01b031681565b6101336101e4366004610a58565b610504565b6101336101f7366004610a32565b6105ee565b61013361020a366004610a58565b61069c565b61013361021d366004610a7e565b610786565b60055461023690600160b01b900460ff1681565b6040519015158152602001610159565b600354610188906001600160a01b031681565b600154610188906001600160a01b031681565b60055461023690600160b81b900460ff1681565b61013361028e366004610a58565b610881565b6101336102a1366004610a58565b61096b565b600254610188906001600160a01b031681565b5f546001600160a01b031633146102ea5760405163472511eb60e11b81523360048201526024015b60405180910390fd5b600554600160b01b900460ff168015158215150361031f576040516369043c1b60e01b815282151560048201526024016102e1565b6005805460ff60b01b1916600160b01b84151590810291909117909155604051821515907fcc994bdd477db86494be73fa1f876be617bd9fc4dacd9eb7635fbe9dfe689780905f90a35050565b5f546001600160a01b031633146103985760405163472511eb60e11b81523360048201526024016102e1565b6001600160a01b0381166103ca57604051631a0e18fd60e01b81526001600160a01b03821660048201526024016102e1565b6003546001600160a01b039081169082168190036104065760405163fc0bb16d60e01b81526001600160a01b03831660048201526024016102e1565b600380546001600160a01b0319166001600160a01b0384811691821790925560405190918316907fc70f26efae70cb1d445ad1a886b8209d7637cf445c822345cf8b0c8af50a2b08905f90a35050565b6001546001600160a01b03168061048057604051633e31d61b60e11b815260040160405180910390fd5b336001600160a01b038216146104ab5760405163472511eb60e11b81523360048201526024016102e1565b5f80546001600160a01b038381166001600160a01b031980841682178555600180549091169055604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b5f546001600160a01b031633146105305760405163472511eb60e11b81523360048201526024016102e1565b6001600160a01b03811661056257604051639952f3c760e01b81526001600160a01b03821660048201526024016102e1565b6002546001600160a01b0390811690821681900361059e57604051637e9c44e160e11b81526001600160a01b03831660048201526024016102e1565b600280546001600160a01b0319166001600160a01b0384811691821790925560405190918316907f403baf9ff2ea4eb5e1573a8df38353cacc7ea1018de8768a85128cbc409d5cd9905f90a35050565b5f546001600160a01b0316331461061a5760405163472511eb60e11b81523360048201526024016102e1565b600554600160b81b900460ff168015158215150361064f57604051631536551160e11b815282151560048201526024016102e1565b6005805460ff60b81b1916600160b81b84151590810291909117909155604051821515907f69b720a8540a4f4c19e9f3a6123dfc10de403a475ca753817f3439475df39e7e905f90a35050565b5f546001600160a01b031633146106c85760405163472511eb60e11b81523360048201526024016102e1565b6001600160a01b0381166106fa57604051635f4cd64960e11b81526001600160a01b03821660048201526024016102e1565b6004546001600160a01b0390811690821681900361073657604051635b8977cb60e11b81526001600160a01b03831660048201526024016102e1565b600480546001600160a01b0319166001600160a01b0384811691821790925560405190918316907f47ffc4777a9849fd88ac272225845f7bbcfa9920f222b459c2e6b28156ce7249905f90a35050565b5f546001600160a01b031633146107b25760405163472511eb60e11b81523360048201526024016102e1565b61271061ffff821611156107e7576040516334c9a62160e21b815261ffff8216600482015261271060248201526044016102e1565b60055461ffff600160a01b909104811690821681900361082057604051631ab0893f60e11b815261ffff831660048201526024016102e1565b6005805461ffff60a01b1916600160a01b61ffff8581169182029290921790925560408051918416825260208201929092527f740c4f8812f57c051142b386664c613b7140458e4fd9420eda309b6d0ad31909910160405180910390a15050565b5f546001600160a01b031633146108ad5760405163472511eb60e11b81523360048201526024016102e1565b6001600160a01b0381166108df576040516312b31bfd60e11b81526001600160a01b03821660048201526024016102e1565b6005546001600160a01b0390811690821681900361091b57604051633e41efeb60e21b81526001600160a01b03831660048201526024016102e1565b600580546001600160a01b0319166001600160a01b0384811691821790925560405190918316907f4ab5be82436d353e61ca18726e984e561f5c1cc7c6d38b29d2553c790434705a905f90a35050565b5f546001600160a01b031633146109975760405163472511eb60e11b81523360048201526024016102e1565b6001600160a01b03811615806109b957505f546001600160a01b038281169116145b156109e257604051630896d9ad60e41b81526001600160a01b03821660048201526024016102e1565b600180546001600160a01b0319166001600160a01b038381169182179092555f8054604051929316917f38d16b8cac22d99fc7c124b9cd0de2d3fa1faef420bfe791d8c362d765e227009190a350565b5f60208284031215610a42575f5ffd5b81358015158114610a51575f5ffd5b9392505050565b5f60208284031215610a68575f5ffd5b81356001600160a01b0381168114610a51575f5ffd5b5f60208284031215610a8e575f5ffd5b813561ffff81168114610a51575f5ffdfea2646970667358221220c4a530389e37a0d6f08ce8e065a947aafaabeeda153d91e6be368350d06addac64736f6c634300081c0033",
    "deployedBytecode": "0x608060405234801561000f575f5ffd5b506004361061011c575f3560e01c8063a26440cb116100a9578063e30c39781161006e578063e30c397814610259578063e4dd77941461026c578063f0f4426014610280578063f2fde38b14610293578063f624f88a146102a6575f5ffd5b8063a26440cb146101e9578063a591f97f146101fc578063be37b12c1461020f578063d52434f814610222578063e2616c8b14610246575f5ffd5b806361d027b3116100ef57806361d027b3146101a05780636d947e4b146101b357806379ba5097146101bc5780638da5cb5b146101c457806397958c28146101d6575f5ffd5b80632b98deaa1461012057806335659fb8146101355780633fab4a6614610162578063478222c214610175575b5f5ffd5b61013361012e366004610a32565b6102b9565b005b60055461014a90600160a01b900461ffff1681565b60405161ffff90911681526020015b60405180910390f35b610133610170366004610a58565b61036c565b600454610188906001600160a01b031681565b6040516001600160a01b039091168152602001610159565b600554610188906001600160a01b031681565b61014a61271081565b610133610456565b5f54610188906001600160a01b031681565b6101336101e4366004610a58565b610504565b6101336101f7366004610a32565b6105ee565b61013361020a366004610a58565b61069c565b61013361021d366004610a7e565b610786565b60055461023690600160b01b900460ff1681565b6040519015158152602001610159565b600354610188906001600160a01b031681565b600154610188906001600160a01b031681565b60055461023690600160b81b900460ff1681565b61013361028e366004610a58565b610881565b6101336102a1366004610a58565b61096b565b600254610188906001600160a01b031681565b5f546001600160a01b031633146102ea5760405163472511eb60e11b81523360048201526024015b60405180910390fd5b600554600160b01b900460ff168015158215150361031f576040516369043c1b60e01b815282151560048201526024016102e1565b6005805460ff60b01b1916600160b01b84151590810291909117909155604051821515907fcc994bdd477db86494be73fa1f876be617bd9fc4dacd9eb7635fbe9dfe689780905f90a35050565b5f546001600160a01b031633146103985760405163472511eb60e11b81523360048201526024016102e1565b6001600160a01b0381166103ca57604051631a0e18fd60e01b81526001600160a01b03821660048201526024016102e1565b6003546001600160a01b039081169082168190036104065760405163fc0bb16d60e01b81526001600160a01b03831660048201526024016102e1565b600380546001600160a01b0319166001600160a01b0384811691821790925560405190918316907fc70f26efae70cb1d445ad1a886b8209d7637cf445c822345cf8b0c8af50a2b08905f90a35050565b6001546001600160a01b03168061048057604051633e31d61b60e11b815260040160405180910390fd5b336001600160a01b038216146104ab5760405163472511eb60e11b81523360048201526024016102e1565b5f80546001600160a01b038381166001600160a01b031980841682178555600180549091169055604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b5f546001600160a01b031633146105305760405163472511eb60e11b81523360048201526024016102e1565b6001600160a01b03811661056257604051639952f3c760e01b81526001600160a01b03821660048201526024016102e1565b6002546001600160a01b0390811690821681900361059e57604051637e9c44e160e11b81526001600160a01b03831660048201526024016102e1565b600280546001600160a01b0319166001600160a01b0384811691821790925560405190918316907f403baf9ff2ea4eb5e1573a8df38353cacc7ea1018de8768a85128cbc409d5cd9905f90a35050565b5f546001600160a01b0316331461061a5760405163472511eb60e11b81523360048201526024016102e1565b600554600160b81b900460ff168015158215150361064f57604051631536551160e11b815282151560048201526024016102e1565b6005805460ff60b81b1916600160b81b84151590810291909117909155604051821515907f69b720a8540a4f4c19e9f3a6123dfc10de403a475ca753817f3439475df39e7e905f90a35050565b5f546001600160a01b031633146106c85760405163472511eb60e11b81523360048201526024016102e1565b6001600160a01b0381166106fa57604051635f4cd64960e11b81526001600160a01b03821660048201526024016102e1565b6004546001600160a01b0390811690821681900361073657604051635b8977cb60e11b81526001600160a01b03831660048201526024016102e1565b600480546001600160a01b0319166001600160a01b0384811691821790925560405190918316907f47ffc4777a9849fd88ac272225845f7bbcfa9920f222b459c2e6b28156ce7249905f90a35050565b5f546001600160a01b031633146107b25760405163472511eb60e11b81523360048201526024016102e1565b61271061ffff821611156107e7576040516334c9a62160e21b815261ffff8216600482015261271060248201526044016102e1565b60055461ffff600160a01b909104811690821681900361082057604051631ab0893f60e11b815261ffff831660048201526024016102e1565b6005805461ffff60a01b1916600160a01b61ffff8581169182029290921790925560408051918416825260208201929092527f740c4f8812f57c051142b386664c613b7140458e4fd9420eda309b6d0ad31909910160405180910390a15050565b5f546001600160a01b031633146108ad5760405163472511eb60e11b81523360048201526024016102e1565b6001600160a01b0381166108df576040516312b31bfd60e11b81526001600160a01b03821660048201526024016102e1565b6005546001600160a01b0390811690821681900361091b57604051633e41efeb60e21b81526001600160a01b03831660048201526024016102e1565b600580546001600160a01b0319166001600160a01b0384811691821790925560405190918316907f4ab5be82436d353e61ca18726e984e561f5c1cc7c6d38b29d2553c790434705a905f90a35050565b5f546001600160a01b031633146109975760405163472511eb60e11b81523360048201526024016102e1565b6001600160a01b03811615806109b957505f546001600160a01b038281169116145b156109e257604051630896d9ad60e41b81526001600160a01b03821660048201526024016102e1565b600180546001600160a01b0319166001600160a01b038381169182179092555f8054604051929316917f38d16b8cac22d99fc7c124b9cd0de2d3fa1faef420bfe791d8c362d765e227009190a350565b5f60208284031215610a42575f5ffd5b81358015158114610a51575f5ffd5b9392505050565b5f60208284031215610a68575f5ffd5b81356001600160a01b0381168114610a51575f5ffd5b5f60208284031215610a8e575f5ffd5b813561ffff81168114610a51575f5ffdfea2646970667358221220c4a530389e37a0d6f08ce8e065a947aafaabeeda153d91e6be368350d06addac64736f6c634300081c0033"
  },
  "FeeVault": {
    "abi": [
      {
        "type": "constructor",
        "inputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "receive",
        "stateMutability": "payable"
      },
      {
        "type": "function",
        "name": "acceptOwnership",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "nativeBalance",
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
        "name": "owner",
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
        "name": "pendingOwner",
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
        "name": "setTreasury",
        "inputs": [
          {
            "name": "newTreasury",
            "type": "address",
            "internalType": "address"
          }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "tokenBalance",
        "inputs": [
          {
            "name": "token",
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
        "name": "transferOwnership",
        "inputs": [
          {
            "name": "newOwner",
            "type": "address",
            "internalType": "address"
          }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "treasury",
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
        "name": "withdrawNativeFees",
        "inputs": [
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
        "name": "withdrawTokenFees",
        "inputs": [
          {
            "name": "token",
            "type": "address",
            "internalType": "address"
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
        "type": "event",
        "name": "NativeFeesWithdrawn",
        "inputs": [
          {
            "name": "treasury",
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
        "name": "OwnershipTransferStarted",
        "inputs": [
          {
            "name": "previousOwner",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          },
          {
            "name": "newOwner",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          }
        ],
        "anonymous": false
      },
      {
        "type": "event",
        "name": "OwnershipTransferred",
        "inputs": [
          {
            "name": "previousOwner",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          },
          {
            "name": "newOwner",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          }
        ],
        "anonymous": false
      },
      {
        "type": "event",
        "name": "TokenFeesWithdrawn",
        "inputs": [
          {
            "name": "token",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          },
          {
            "name": "treasury",
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
        "name": "TreasuryUpdated",
        "inputs": [
          {
            "name": "previousTreasury",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          },
          {
            "name": "newTreasury",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          }
        ],
        "anonymous": false
      },
      {
        "type": "error",
        "name": "Erc20TransferFailed",
        "inputs": [
          {
            "name": "token",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "recipient",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "amount",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      },
      {
        "type": "error",
        "name": "InvalidAmount",
        "inputs": [
          {
            "name": "amount",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      },
      {
        "type": "error",
        "name": "InvalidNewOwner",
        "inputs": [
          {
            "name": "newOwner",
            "type": "address",
            "internalType": "address"
          }
        ]
      },
      {
        "type": "error",
        "name": "InvalidToken",
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
        "name": "InvalidTreasury",
        "inputs": [
          {
            "name": "treasury",
            "type": "address",
            "internalType": "address"
          }
        ]
      },
      {
        "type": "error",
        "name": "NativeTransferFailed",
        "inputs": [
          {
            "name": "recipient",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "amount",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      },
      {
        "type": "error",
        "name": "NoPendingOwner",
        "inputs": []
      },
      {
        "type": "error",
        "name": "TreasuryNotSet",
        "inputs": []
      },
      {
        "type": "error",
        "name": "TreasuryUnchanged",
        "inputs": [
          {
            "name": "treasury",
            "type": "address",
            "internalType": "address"
          }
        ]
      },
      {
        "type": "error",
        "name": "Unauthorized",
        "inputs": [
          {
            "name": "caller",
            "type": "address",
            "internalType": "address"
          }
        ]
      }
    ],
    "bytecode": "0x6080604052348015600e575f5ffd5b505f80546001600160a01b0319163390811782556040519091907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0908290a36108ba8061005a5f395ff3fe608060405260043610610092575f3560e01c8063e30c397811610057578063e30c397814610148578063ecaec54314610167578063eedc966a14610186578063f0f44260146101a5578063f2fde38b146101c4575f5ffd5b8063579afaa31461009d57806361d027b3146100be57806379ba5097146100fa578063865fc5011461010e5780638da5cb5b1461012a575f5ffd5b3661009957005b5f5ffd5b3480156100a8575f5ffd5b506100bc6100b73660046107ef565b6101e3565b005b3480156100c9575f5ffd5b506002546100dd906001600160a01b031681565b6040516001600160a01b0390911681526020015b60405180910390f35b348015610105575f5ffd5b506100bc610393565b348015610119575f5ffd5b50475b6040519081526020016100f1565b348015610135575f5ffd5b505f546100dd906001600160a01b031681565b348015610153575f5ffd5b506001546100dd906001600160a01b031681565b348015610172575f5ffd5b506100bc610181366004610817565b610441565b348015610191575f5ffd5b5061011c6101a036600461082e565b610584565b3480156101b0575f5ffd5b506100bc6101bf36600461082e565b610623565b3480156101cf575f5ffd5b506100bc6101de36600461082e565b61070d565b5f546001600160a01b031633146102145760405163472511eb60e11b81523360048201526024015b60405180910390fd5b6001600160a01b0382166102465760405163961c9a4f60e01b81526001600160a01b038316600482015260240161020b565b805f0361026957604051633728b83d60e01b81526004810182905260240161020b565b6002546001600160a01b0316806102935760405163b2c4cce960e01b815260040160405180910390fd5b60405163a9059cbb60e01b81526001600160a01b038281166004830152602482018490525f919085169063a9059cbb906044016020604051808303815f875af11580156102e2573d5f5f3e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610306919061084e565b9050806103405760405163b031630560e01b81526001600160a01b038086166004830152831660248201526044810184905260640161020b565b816001600160a01b0316846001600160a01b03167f6241d2d4228642a412963629be2a38b8fea3c68fc02692659f2afb536393e3af8560405161038591815260200190565b60405180910390a350505050565b6001546001600160a01b0316806103bd57604051633e31d61b60e11b815260040160405180910390fd5b336001600160a01b038216146103e85760405163472511eb60e11b815233600482015260240161020b565b5f80546001600160a01b038381166001600160a01b031980841682178555600180549091169055604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b5f546001600160a01b0316331461046d5760405163472511eb60e11b815233600482015260240161020b565b805f0361049057604051633728b83d60e01b81526004810182905260240161020b565b6002546001600160a01b0316806104ba5760405163b2c4cce960e01b815260040160405180910390fd5b5f816001600160a01b0316836040515f6040518083038185875af1925050503d805f8114610503576040519150601f19603f3d011682016040523d82523d5f602084013e610508565b606091505b505090508061053c5760405163296c17bb60e21b81526001600160a01b03831660048201526024810184905260440161020b565b816001600160a01b03167fcc0b44e3b0c65b15a22125b3fe1169945afed879ff86415c1d624226e32282448460405161057791815260200190565b60405180910390a2505050565b5f6001600160a01b0382166105b75760405163961c9a4f60e01b81526001600160a01b038316600482015260240161020b565b6040516370a0823160e01b81523060048201526001600160a01b038316906370a0823190602401602060405180830381865afa1580156105f9573d5f5f3e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061061d919061086d565b92915050565b5f546001600160a01b0316331461064f5760405163472511eb60e11b815233600482015260240161020b565b6001600160a01b038116610681576040516312b31bfd60e11b81526001600160a01b038216600482015260240161020b565b6002546001600160a01b039081169082168190036106bd57604051633e41efeb60e21b81526001600160a01b038316600482015260240161020b565b600280546001600160a01b0319166001600160a01b0384811691821790925560405190918316907f4ab5be82436d353e61ca18726e984e561f5c1cc7c6d38b29d2553c790434705a905f90a35050565b5f546001600160a01b031633146107395760405163472511eb60e11b815233600482015260240161020b565b6001600160a01b038116158061075b57505f546001600160a01b038281169116145b1561078457604051630896d9ad60e41b81526001600160a01b038216600482015260240161020b565b600180546001600160a01b0319166001600160a01b038381169182179092555f8054604051929316917f38d16b8cac22d99fc7c124b9cd0de2d3fa1faef420bfe791d8c362d765e227009190a350565b80356001600160a01b03811681146107ea575f5ffd5b919050565b5f5f60408385031215610800575f5ffd5b610809836107d4565b946020939093013593505050565b5f60208284031215610827575f5ffd5b5035919050565b5f6020828403121561083e575f5ffd5b610847826107d4565b9392505050565b5f6020828403121561085e575f5ffd5b81518015158114610847575f5ffd5b5f6020828403121561087d575f5ffd5b505191905056fea2646970667358221220cbd4d74eb1b8eb79d3d4687343227d6d236474a2870914c87cb6ff17ddf3304864736f6c634300081c0033",
    "deployedBytecode": "0x608060405260043610610092575f3560e01c8063e30c397811610057578063e30c397814610148578063ecaec54314610167578063eedc966a14610186578063f0f44260146101a5578063f2fde38b146101c4575f5ffd5b8063579afaa31461009d57806361d027b3146100be57806379ba5097146100fa578063865fc5011461010e5780638da5cb5b1461012a575f5ffd5b3661009957005b5f5ffd5b3480156100a8575f5ffd5b506100bc6100b73660046107ef565b6101e3565b005b3480156100c9575f5ffd5b506002546100dd906001600160a01b031681565b6040516001600160a01b0390911681526020015b60405180910390f35b348015610105575f5ffd5b506100bc610393565b348015610119575f5ffd5b50475b6040519081526020016100f1565b348015610135575f5ffd5b505f546100dd906001600160a01b031681565b348015610153575f5ffd5b506001546100dd906001600160a01b031681565b348015610172575f5ffd5b506100bc610181366004610817565b610441565b348015610191575f5ffd5b5061011c6101a036600461082e565b610584565b3480156101b0575f5ffd5b506100bc6101bf36600461082e565b610623565b3480156101cf575f5ffd5b506100bc6101de36600461082e565b61070d565b5f546001600160a01b031633146102145760405163472511eb60e11b81523360048201526024015b60405180910390fd5b6001600160a01b0382166102465760405163961c9a4f60e01b81526001600160a01b038316600482015260240161020b565b805f0361026957604051633728b83d60e01b81526004810182905260240161020b565b6002546001600160a01b0316806102935760405163b2c4cce960e01b815260040160405180910390fd5b60405163a9059cbb60e01b81526001600160a01b038281166004830152602482018490525f919085169063a9059cbb906044016020604051808303815f875af11580156102e2573d5f5f3e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610306919061084e565b9050806103405760405163b031630560e01b81526001600160a01b038086166004830152831660248201526044810184905260640161020b565b816001600160a01b0316846001600160a01b03167f6241d2d4228642a412963629be2a38b8fea3c68fc02692659f2afb536393e3af8560405161038591815260200190565b60405180910390a350505050565b6001546001600160a01b0316806103bd57604051633e31d61b60e11b815260040160405180910390fd5b336001600160a01b038216146103e85760405163472511eb60e11b815233600482015260240161020b565b5f80546001600160a01b038381166001600160a01b031980841682178555600180549091169055604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b5f546001600160a01b0316331461046d5760405163472511eb60e11b815233600482015260240161020b565b805f0361049057604051633728b83d60e01b81526004810182905260240161020b565b6002546001600160a01b0316806104ba5760405163b2c4cce960e01b815260040160405180910390fd5b5f816001600160a01b0316836040515f6040518083038185875af1925050503d805f8114610503576040519150601f19603f3d011682016040523d82523d5f602084013e610508565b606091505b505090508061053c5760405163296c17bb60e21b81526001600160a01b03831660048201526024810184905260440161020b565b816001600160a01b03167fcc0b44e3b0c65b15a22125b3fe1169945afed879ff86415c1d624226e32282448460405161057791815260200190565b60405180910390a2505050565b5f6001600160a01b0382166105b75760405163961c9a4f60e01b81526001600160a01b038316600482015260240161020b565b6040516370a0823160e01b81523060048201526001600160a01b038316906370a0823190602401602060405180830381865afa1580156105f9573d5f5f3e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061061d919061086d565b92915050565b5f546001600160a01b0316331461064f5760405163472511eb60e11b815233600482015260240161020b565b6001600160a01b038116610681576040516312b31bfd60e11b81526001600160a01b038216600482015260240161020b565b6002546001600160a01b039081169082168190036106bd57604051633e41efeb60e21b81526001600160a01b038316600482015260240161020b565b600280546001600160a01b0319166001600160a01b0384811691821790925560405190918316907f4ab5be82436d353e61ca18726e984e561f5c1cc7c6d38b29d2553c790434705a905f90a35050565b5f546001600160a01b031633146107395760405163472511eb60e11b815233600482015260240161020b565b6001600160a01b038116158061075b57505f546001600160a01b038281169116145b1561078457604051630896d9ad60e41b81526001600160a01b038216600482015260240161020b565b600180546001600160a01b0319166001600160a01b038381169182179092555f8054604051929316917f38d16b8cac22d99fc7c124b9cd0de2d3fa1faef420bfe791d8c362d765e227009190a350565b80356001600160a01b03811681146107ea575f5ffd5b919050565b5f5f60408385031215610800575f5ffd5b610809836107d4565b946020939093013593505050565b5f60208284031215610827575f5ffd5b5035919050565b5f6020828403121561083e575f5ffd5b610847826107d4565b9392505050565b5f6020828403121561085e575f5ffd5b81518015158114610847575f5ffd5b5f6020828403121561087d575f5ffd5b505191905056fea2646970667358221220cbd4d74eb1b8eb79d3d4687343227d6d236474a2870914c87cb6ff17ddf3304864736f6c634300081c0033"
  },
  "EscrowAgreement": {
    "abi": [
      {
        "type": "function",
        "name": "arbitrator",
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
        "name": "buyer",
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
        "name": "dealId",
        "inputs": [],
        "outputs": [
          {
            "name": "",
            "type": "bytes32",
            "internalType": "bytes32"
          }
        ],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "dealVersionHash",
        "inputs": [],
        "outputs": [
          {
            "name": "",
            "type": "bytes32",
            "internalType": "bytes32"
          }
        ],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "factory",
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
        "name": "feeVault",
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
        "name": "initialize",
        "inputs": [
          {
            "name": "initialization",
            "type": "tuple",
            "internalType": "struct EscrowAgreement.AgreementInitialization",
            "components": [
              {
                "name": "protocolConfig",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "buyer",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "seller",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "settlementToken",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "arbitrator",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "dealId",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "dealVersionHash",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "totalAmount",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "milestoneCount",
                "type": "uint32",
                "internalType": "uint32"
              }
            ]
          }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "initialized",
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
        "name": "initializedAt",
        "inputs": [],
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
        "name": "milestoneCount",
        "inputs": [],
        "outputs": [
          {
            "name": "",
            "type": "uint32",
            "internalType": "uint32"
          }
        ],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "protocolConfig",
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
        "name": "protocolFeeBps",
        "inputs": [],
        "outputs": [
          {
            "name": "",
            "type": "uint16",
            "internalType": "uint16"
          }
        ],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "seller",
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
        "name": "settlementToken",
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
        "name": "totalAmount",
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
        "name": "AgreementInitialized",
        "inputs": [
          {
            "name": "dealId",
            "type": "bytes32",
            "indexed": true,
            "internalType": "bytes32"
          },
          {
            "name": "dealVersionHash",
            "type": "bytes32",
            "indexed": true,
            "internalType": "bytes32"
          },
          {
            "name": "factory",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          },
          {
            "name": "protocolConfig",
            "type": "address",
            "indexed": false,
            "internalType": "address"
          },
          {
            "name": "buyer",
            "type": "address",
            "indexed": false,
            "internalType": "address"
          },
          {
            "name": "seller",
            "type": "address",
            "indexed": false,
            "internalType": "address"
          },
          {
            "name": "settlementToken",
            "type": "address",
            "indexed": false,
            "internalType": "address"
          },
          {
            "name": "arbitrator",
            "type": "address",
            "indexed": false,
            "internalType": "address"
          },
          {
            "name": "feeVault",
            "type": "address",
            "indexed": false,
            "internalType": "address"
          },
          {
            "name": "protocolFeeBps",
            "type": "uint16",
            "indexed": false,
            "internalType": "uint16"
          },
          {
            "name": "totalAmount",
            "type": "uint256",
            "indexed": false,
            "internalType": "uint256"
          },
          {
            "name": "milestoneCount",
            "type": "uint32",
            "indexed": false,
            "internalType": "uint32"
          }
        ],
        "anonymous": false
      },
      {
        "type": "error",
        "name": "AlreadyInitialized",
        "inputs": []
      },
      {
        "type": "error",
        "name": "ArbitratorNotApproved",
        "inputs": [
          {
            "name": "arbitrator",
            "type": "address",
            "internalType": "address"
          }
        ]
      },
      {
        "type": "error",
        "name": "ArbitratorRegistryNotSet",
        "inputs": []
      },
      {
        "type": "error",
        "name": "FeeVaultNotSet",
        "inputs": []
      },
      {
        "type": "error",
        "name": "IdenticalParties",
        "inputs": [
          {
            "name": "buyer",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "seller",
            "type": "address",
            "internalType": "address"
          }
        ]
      },
      {
        "type": "error",
        "name": "InvalidBuyer",
        "inputs": [
          {
            "name": "buyer",
            "type": "address",
            "internalType": "address"
          }
        ]
      },
      {
        "type": "error",
        "name": "InvalidDealId",
        "inputs": [
          {
            "name": "dealId",
            "type": "bytes32",
            "internalType": "bytes32"
          }
        ]
      },
      {
        "type": "error",
        "name": "InvalidDealVersionHash",
        "inputs": [
          {
            "name": "dealVersionHash",
            "type": "bytes32",
            "internalType": "bytes32"
          }
        ]
      },
      {
        "type": "error",
        "name": "InvalidMilestoneCount",
        "inputs": [
          {
            "name": "milestoneCount",
            "type": "uint32",
            "internalType": "uint32"
          }
        ]
      },
      {
        "type": "error",
        "name": "InvalidProtocolConfig",
        "inputs": [
          {
            "name": "protocolConfig",
            "type": "address",
            "internalType": "address"
          }
        ]
      },
      {
        "type": "error",
        "name": "InvalidSeller",
        "inputs": [
          {
            "name": "seller",
            "type": "address",
            "internalType": "address"
          }
        ]
      },
      {
        "type": "error",
        "name": "InvalidSettlementToken",
        "inputs": [
          {
            "name": "settlementToken",
            "type": "address",
            "internalType": "address"
          }
        ]
      },
      {
        "type": "error",
        "name": "InvalidTotalAmount",
        "inputs": [
          {
            "name": "totalAmount",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      },
      {
        "type": "error",
        "name": "TokenAllowlistNotSet",
        "inputs": []
      },
      {
        "type": "error",
        "name": "TokenNotAllowed",
        "inputs": [
          {
            "name": "settlementToken",
            "type": "address",
            "internalType": "address"
          }
        ]
      }
    ],
    "bytecode": "0x6080604052348015600e575f5ffd5b50610ce68061001c5f395ff3fe608060405234801561000f575f5ffd5b50600436106100f0575f3560e01c80636cc6cde111610093578063ba46404811610063578063ba46404814610231578063c45a01551461023a578063d30a25f014610251578063f5efbb4f14610266575f5ffd5b80636cc6cde1146101c15780637150d8ae146101d45780637b9e618d146101e757806391cf6d3e146101fa575f5ffd5b80631a39d8ef116100ce5780631a39d8ef146101655780631fa0ff451461017c57806335659fb814610185578063478222c2146101ae575f5ffd5b80630681ca55146100f457806308551a531461011e578063158ef93e14610149575b5f5ffd5b600a546101049063ffffffff1681565b60405163ffffffff90911681526020015b60405180910390f35b600454610131906001600160a01b031681565b6040516001600160a01b039091168152602001610115565b5f546101559060ff1681565b6040519015158152602001610115565b61016e60095481565b604051908152602001610115565b61016e60085481565b600a5461019b90640100000000900461ffff1681565b60405161ffff9091168152602001610115565b600254610131906001600160a01b031681565b600654610131906001600160a01b031681565b600354610131906001600160a01b031681565b600554610131906001600160a01b031681565b600a54610218906601000000000000900467ffffffffffffffff1681565b60405167ffffffffffffffff9091168152602001610115565b61016e60075481565b5f546101319061010090046001600160a01b031681565b61026461025f366004610be2565b610279565b005b600154610131906001600160a01b031681565b5f5460ff161561029b5760405162dc149f60e41b815260040160405180910390fd5b5f6102a96020830183610c10565b90506102b4826105c9565b5f6102be8261086a565b90506102e9816102d46080860160608701610c10565b6102e460a0870160808801610c10565b610a9e565b5f805433610100026001600160a81b031990911617600190811790915580546001600160a01b038481166001600160a01b031992831617909255604080840151600280549190941692169190911790915561034990840160208501610c10565b600380546001600160a01b0319166001600160a01b03929092169190911790556103796060840160408501610c10565b600480546001600160a01b0319166001600160a01b03929092169190911790556103a96080840160608501610c10565b600580546001600160a01b0319166001600160a01b03929092169190911790556103d960a0840160808501610c10565b600680546001600160a01b0319166001600160a01b039290921691909117905560a083013560075560c083013560085560e083013560095561042361012084016101008501610c32565b600a5f6101000a81548163ffffffff021916908363ffffffff1602179055508060600151600a60046101000a81548161ffff021916908361ffff16021790555042600a60066101000a81548167ffffffffffffffff021916908367ffffffffffffffff160217905550336001600160a01b03166008546007547fcbe193d3cc9695b6b92f220c9672373427ac64226aab43e68119c8d6e86ee8bf8560035f9054906101000a90046001600160a01b031660045f9054906101000a90046001600160a01b031660055f9054906101000a90046001600160a01b031660065f9054906101000a90046001600160a01b031660025f9054906101000a90046001600160a01b0316600a60049054906101000a900461ffff16600954600a5f9054906101000a900463ffffffff166040516105bc999897969594939291906001600160a01b03998a168152978916602089015295881660408801529387166060870152918616608086015290941660a084015261ffff9390931660c083015260e082019290925263ffffffff919091166101008201526101200190565b60405180910390a4505050565b5f6105d76020830183610c10565b6001600160a01b03160361061c576105f26020820182610c10565b604051636139278960e01b81526001600160a01b0390911660048201526024015b60405180910390fd5b5f61062d6040830160208401610c10565b6001600160a01b0316036106705761064b6040820160208301610c10565b604051634d7cf57d60e01b81526001600160a01b039091166004820152602401610613565b5f6106816060830160408401610c10565b6001600160a01b0316036106c45761069f6060820160408301610c10565b604051630606500560e31b81526001600160a01b039091166004820152602401610613565b6106d46060820160408301610c10565b6001600160a01b03166106ed6040830160208401610c10565b6001600160a01b0316036107475761070b6040820160208301610c10565b61071b6060830160408401610c10565b6040516339574d5960e21b81526001600160a01b03928316600482015291166024820152604401610613565b5f6107586080830160608401610c10565b6001600160a01b03160361079b576107766080820160608301610c10565b6040516395655d3d60e01b81526001600160a01b039091166004820152602401610613565b60a08101356107c35760405163855ce7f960e01b815260a08201356004820152602401610613565b60c08101356107eb57604051630ef42f8b60e11b815260c08201356004820152602401610613565b8060e001355f0361081557604051633418edef60e21b815260e08201356004820152602401610613565b61082761012082016101008301610c32565b63ffffffff165f036108675761084561012082016101008301610c32565b6040516307450f2160e41b815263ffffffff9091166004820152602401610613565b50565b604080516080810182525f808252602082018190529181018290526060810191909152816001600160a01b031663f624f88a6040518163ffffffff1660e01b8152600401602060405180830381865afa1580156108c9573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906108ed9190610c55565b6001600160a01b0316808252610916576040516316f8b43d60e21b815260040160405180910390fd5b816001600160a01b031663e2616c8b6040518163ffffffff1660e01b8152600401602060405180830381865afa158015610952573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906109769190610c55565b6001600160a01b0316602082018190526109a357604051638b27f0d960e01b815260040160405180910390fd5b816001600160a01b031663478222c26040518163ffffffff1660e01b8152600401602060405180830381865afa1580156109df573d5f5f3e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610a039190610c55565b6001600160a01b031660408201819052610a3057604051638199a68560e01b815260040160405180910390fd5b816001600160a01b03166335659fb86040518163ffffffff1660e01b8152600401602060405180830381865afa158015610a6c573d5f5f3e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610a909190610c70565b61ffff166060820152919050565b825160405163cbe230c360e01b81526001600160a01b0384811660048301529091169063cbe230c390602401602060405180830381865afa158015610ae5573d5f5f3e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610b099190610c91565b610b315760405163094403b760e41b81526001600160a01b0383166004820152602401610613565b6001600160a01b03811615801590610bb457506020830151604051631ac97bbf60e31b81526001600160a01b0383811660048301529091169063d64bddf890602401602060405180830381865afa158015610b8e573d5f5f3e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610bb29190610c91565b155b15610bdd5760405163a9e5fced60e01b81526001600160a01b0382166004820152602401610613565b505050565b5f610120828403128015610bf4575f5ffd5b509092915050565b6001600160a01b0381168114610867575f5ffd5b5f60208284031215610c20575f5ffd5b8135610c2b81610bfc565b9392505050565b5f60208284031215610c42575f5ffd5b813563ffffffff81168114610c2b575f5ffd5b5f60208284031215610c65575f5ffd5b8151610c2b81610bfc565b5f60208284031215610c80575f5ffd5b815161ffff81168114610c2b575f5ffd5b5f60208284031215610ca1575f5ffd5b81518015158114610c2b575f5ffdfea26469706673582212200b24fbdcce2b794e56b6acfce0ad30ec0be5fa2318f6097e8f4396cb928710bb64736f6c634300081c0033",
    "deployedBytecode": "0x608060405234801561000f575f5ffd5b50600436106100f0575f3560e01c80636cc6cde111610093578063ba46404811610063578063ba46404814610231578063c45a01551461023a578063d30a25f014610251578063f5efbb4f14610266575f5ffd5b80636cc6cde1146101c15780637150d8ae146101d45780637b9e618d146101e757806391cf6d3e146101fa575f5ffd5b80631a39d8ef116100ce5780631a39d8ef146101655780631fa0ff451461017c57806335659fb814610185578063478222c2146101ae575f5ffd5b80630681ca55146100f457806308551a531461011e578063158ef93e14610149575b5f5ffd5b600a546101049063ffffffff1681565b60405163ffffffff90911681526020015b60405180910390f35b600454610131906001600160a01b031681565b6040516001600160a01b039091168152602001610115565b5f546101559060ff1681565b6040519015158152602001610115565b61016e60095481565b604051908152602001610115565b61016e60085481565b600a5461019b90640100000000900461ffff1681565b60405161ffff9091168152602001610115565b600254610131906001600160a01b031681565b600654610131906001600160a01b031681565b600354610131906001600160a01b031681565b600554610131906001600160a01b031681565b600a54610218906601000000000000900467ffffffffffffffff1681565b60405167ffffffffffffffff9091168152602001610115565b61016e60075481565b5f546101319061010090046001600160a01b031681565b61026461025f366004610be2565b610279565b005b600154610131906001600160a01b031681565b5f5460ff161561029b5760405162dc149f60e41b815260040160405180910390fd5b5f6102a96020830183610c10565b90506102b4826105c9565b5f6102be8261086a565b90506102e9816102d46080860160608701610c10565b6102e460a0870160808801610c10565b610a9e565b5f805433610100026001600160a81b031990911617600190811790915580546001600160a01b038481166001600160a01b031992831617909255604080840151600280549190941692169190911790915561034990840160208501610c10565b600380546001600160a01b0319166001600160a01b03929092169190911790556103796060840160408501610c10565b600480546001600160a01b0319166001600160a01b03929092169190911790556103a96080840160608501610c10565b600580546001600160a01b0319166001600160a01b03929092169190911790556103d960a0840160808501610c10565b600680546001600160a01b0319166001600160a01b039290921691909117905560a083013560075560c083013560085560e083013560095561042361012084016101008501610c32565b600a5f6101000a81548163ffffffff021916908363ffffffff1602179055508060600151600a60046101000a81548161ffff021916908361ffff16021790555042600a60066101000a81548167ffffffffffffffff021916908367ffffffffffffffff160217905550336001600160a01b03166008546007547fcbe193d3cc9695b6b92f220c9672373427ac64226aab43e68119c8d6e86ee8bf8560035f9054906101000a90046001600160a01b031660045f9054906101000a90046001600160a01b031660055f9054906101000a90046001600160a01b031660065f9054906101000a90046001600160a01b031660025f9054906101000a90046001600160a01b0316600a60049054906101000a900461ffff16600954600a5f9054906101000a900463ffffffff166040516105bc999897969594939291906001600160a01b03998a168152978916602089015295881660408801529387166060870152918616608086015290941660a084015261ffff9390931660c083015260e082019290925263ffffffff919091166101008201526101200190565b60405180910390a4505050565b5f6105d76020830183610c10565b6001600160a01b03160361061c576105f26020820182610c10565b604051636139278960e01b81526001600160a01b0390911660048201526024015b60405180910390fd5b5f61062d6040830160208401610c10565b6001600160a01b0316036106705761064b6040820160208301610c10565b604051634d7cf57d60e01b81526001600160a01b039091166004820152602401610613565b5f6106816060830160408401610c10565b6001600160a01b0316036106c45761069f6060820160408301610c10565b604051630606500560e31b81526001600160a01b039091166004820152602401610613565b6106d46060820160408301610c10565b6001600160a01b03166106ed6040830160208401610c10565b6001600160a01b0316036107475761070b6040820160208301610c10565b61071b6060830160408401610c10565b6040516339574d5960e21b81526001600160a01b03928316600482015291166024820152604401610613565b5f6107586080830160608401610c10565b6001600160a01b03160361079b576107766080820160608301610c10565b6040516395655d3d60e01b81526001600160a01b039091166004820152602401610613565b60a08101356107c35760405163855ce7f960e01b815260a08201356004820152602401610613565b60c08101356107eb57604051630ef42f8b60e11b815260c08201356004820152602401610613565b8060e001355f0361081557604051633418edef60e21b815260e08201356004820152602401610613565b61082761012082016101008301610c32565b63ffffffff165f036108675761084561012082016101008301610c32565b6040516307450f2160e41b815263ffffffff9091166004820152602401610613565b50565b604080516080810182525f808252602082018190529181018290526060810191909152816001600160a01b031663f624f88a6040518163ffffffff1660e01b8152600401602060405180830381865afa1580156108c9573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906108ed9190610c55565b6001600160a01b0316808252610916576040516316f8b43d60e21b815260040160405180910390fd5b816001600160a01b031663e2616c8b6040518163ffffffff1660e01b8152600401602060405180830381865afa158015610952573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906109769190610c55565b6001600160a01b0316602082018190526109a357604051638b27f0d960e01b815260040160405180910390fd5b816001600160a01b031663478222c26040518163ffffffff1660e01b8152600401602060405180830381865afa1580156109df573d5f5f3e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610a039190610c55565b6001600160a01b031660408201819052610a3057604051638199a68560e01b815260040160405180910390fd5b816001600160a01b03166335659fb86040518163ffffffff1660e01b8152600401602060405180830381865afa158015610a6c573d5f5f3e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610a909190610c70565b61ffff166060820152919050565b825160405163cbe230c360e01b81526001600160a01b0384811660048301529091169063cbe230c390602401602060405180830381865afa158015610ae5573d5f5f3e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610b099190610c91565b610b315760405163094403b760e41b81526001600160a01b0383166004820152602401610613565b6001600160a01b03811615801590610bb457506020830151604051631ac97bbf60e31b81526001600160a01b0383811660048301529091169063d64bddf890602401602060405180830381865afa158015610b8e573d5f5f3e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610bb29190610c91565b155b15610bdd5760405163a9e5fced60e01b81526001600160a01b0382166004820152602401610613565b505050565b5f610120828403128015610bf4575f5ffd5b509092915050565b6001600160a01b0381168114610867575f5ffd5b5f60208284031215610c20575f5ffd5b8135610c2b81610bfc565b9392505050565b5f60208284031215610c42575f5ffd5b813563ffffffff81168114610c2b575f5ffd5b5f60208284031215610c65575f5ffd5b8151610c2b81610bfc565b5f60208284031215610c80575f5ffd5b815161ffff81168114610c2b575f5ffd5b5f60208284031215610ca1575f5ffd5b81518015158114610c2b575f5ffdfea26469706673582212200b24fbdcce2b794e56b6acfce0ad30ec0be5fa2318f6097e8f4396cb928710bb64736f6c634300081c0033"
  },
  "EscrowFactory": {
    "abi": [
      {
        "type": "constructor",
        "inputs": [
          {
            "name": "agreementImplementationAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "protocolConfigAddress",
            "type": "address",
            "internalType": "address"
          }
        ],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "agreementImplementation",
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
        "name": "createAgreement",
        "inputs": [
          {
            "name": "creation",
            "type": "tuple",
            "internalType": "struct EscrowFactory.EscrowCreation",
            "components": [
              {
                "name": "buyer",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "seller",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "settlementToken",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "arbitrator",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "dealId",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "dealVersionHash",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "totalAmount",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "milestoneCount",
                "type": "uint32",
                "internalType": "uint32"
              }
            ]
          }
        ],
        "outputs": [
          {
            "name": "agreementAddress",
            "type": "address",
            "internalType": "address"
          }
        ],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "getAgreement",
        "inputs": [
          {
            "name": "dealId",
            "type": "bytes32",
            "internalType": "bytes32"
          }
        ],
        "outputs": [
          {
            "name": "agreementAddress",
            "type": "address",
            "internalType": "address"
          }
        ],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "hasAgreement",
        "inputs": [
          {
            "name": "dealId",
            "type": "bytes32",
            "internalType": "bytes32"
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
        "name": "isAgreementFromFactory",
        "inputs": [
          {
            "name": "agreementAddress",
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
        "name": "predictAgreementAddress",
        "inputs": [
          {
            "name": "dealId",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "dealVersionHash",
            "type": "bytes32",
            "internalType": "bytes32"
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
        "name": "protocolConfig",
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
        "type": "event",
        "name": "AgreementCreated",
        "inputs": [
          {
            "name": "dealId",
            "type": "bytes32",
            "indexed": true,
            "internalType": "bytes32"
          },
          {
            "name": "dealVersionHash",
            "type": "bytes32",
            "indexed": true,
            "internalType": "bytes32"
          },
          {
            "name": "agreement",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          },
          {
            "name": "protocolConfig",
            "type": "address",
            "indexed": false,
            "internalType": "address"
          },
          {
            "name": "buyer",
            "type": "address",
            "indexed": false,
            "internalType": "address"
          },
          {
            "name": "seller",
            "type": "address",
            "indexed": false,
            "internalType": "address"
          },
          {
            "name": "settlementToken",
            "type": "address",
            "indexed": false,
            "internalType": "address"
          },
          {
            "name": "arbitrator",
            "type": "address",
            "indexed": false,
            "internalType": "address"
          },
          {
            "name": "totalAmount",
            "type": "uint256",
            "indexed": false,
            "internalType": "uint256"
          },
          {
            "name": "milestoneCount",
            "type": "uint32",
            "indexed": false,
            "internalType": "uint32"
          }
        ],
        "anonymous": false
      },
      {
        "type": "error",
        "name": "AgreementInitializationFailed",
        "inputs": []
      },
      {
        "type": "error",
        "name": "AgreementNotFound",
        "inputs": [
          {
            "name": "dealId",
            "type": "bytes32",
            "internalType": "bytes32"
          }
        ]
      },
      {
        "type": "error",
        "name": "CreateEscrowPaused",
        "inputs": []
      },
      {
        "type": "error",
        "name": "DealAlreadyExists",
        "inputs": [
          {
            "name": "dealId",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "agreement",
            "type": "address",
            "internalType": "address"
          }
        ]
      },
      {
        "type": "error",
        "name": "InvalidAgreementImplementation",
        "inputs": [
          {
            "name": "agreementImplementation",
            "type": "address",
            "internalType": "address"
          }
        ]
      },
      {
        "type": "error",
        "name": "InvalidProtocolConfig",
        "inputs": [
          {
            "name": "protocolConfig",
            "type": "address",
            "internalType": "address"
          }
        ]
      }
    ],
    "bytecode": "0x60c060405234801561000f575f5ffd5b50604051610b3e380380610b3e83398101604081905261002e916101f9565b610037826100ac565b6100645760405163182395c160e11b81526001600160a01b03831660048201526024015b60405180910390fd5b61006d81610171565b61009557604051636139278960e01b81526001600160a01b038216600482015260240161005b565b6001600160a01b039182166080521660a052610240565b5f6001600160a01b03821615806100cb57506001600160a01b0382163b155b156100d757505f919050565b60408051600481526024810182526020810180516001600160e01b0316630ac77c9f60e11b17905290515f9182916001600160a01b038616916101199161022a565b5f60405180830381855afa9150503d805f8114610151576040519150601f19603f3d011682016040523d82523d5f602084013e610156565b606091505b5091509150818015610169575080516020145b949350505050565b5f6001600160a01b038216158061019057506001600160a01b0382163b155b1561019c57505f919050565b60408051600481526024810182526020810180516001600160e01b0316631aa4869f60e31b17905290515f9182916001600160a01b038616916101199161022a565b80516001600160a01b03811681146101f4575f5ffd5b919050565b5f5f6040838503121561020a575f5ffd5b610213836101de565b9150610221602084016101de565b90509250929050565b5f82518060208501845e5f920191825250919050565b60805160a0516108bb6102835f395f8181610165015281816101f301528181610355015261051401525f81816083015281816101c2015261031f01526108bb5ff3fe608060405234801561000f575f5ffd5b506004361061007a575f3560e01c80638589840a116100585780638589840a1461010f578063bf13a9921461013a578063f42eb7651461014d578063f5efbb4f14610160575f5ffd5b80631600a0c81461007e578063204a88c5146100c257806341b258c0146100fc575b5f5ffd5b6100a57f000000000000000000000000000000000000000000000000000000000000000081565b6040516001600160a01b0390911681526020015b60405180910390f35b6100ec6100d0366004610747565b5f908152602081905260409020546001600160a01b0316151590565b60405190151581526020016100b9565b6100a561010a36600461075e565b610187565b6100ec61011d36600461077e565b6001600160a01b03165f9081526001602052604090205460ff1690565b6100a56101483660046107ab565b6101f0565b6100a561015b366004610747565b6105e3565b6100a57f000000000000000000000000000000000000000000000000000000000000000081565b5f5f83836040516020016101a5929190918252602082015260400190565b6040516020818303038152906040528051906020012090506101e87f00000000000000000000000000000000000000000000000000000000000000008230610620565b949350505050565b5f7f00000000000000000000000000000000000000000000000000000000000000006001600160a01b031663d52434f86040518163ffffffff1660e01b8152600401602060405180830381865afa15801561024d573d5f5f3e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061027191906107c5565b1561028f576040516304fb289360e31b815260040160405180910390fd5b60808201355f818152602081905260409020546001600160a01b031680156102e15760405163c06ce9e160e01b8152600481018390526001600160a01b03821660248201526044015b60405180910390fd5b5f828560a00135604051602001610302929190918252602082015260400190565b6040516020818303038152906040528051906020012090506103447f00000000000000000000000000000000000000000000000000000000000000008261068d565b93505f6040518061012001604052807f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03168152602001875f016020810190610394919061077e565b6001600160a01b031681526020018760200160208101906103b5919061077e565b6001600160a01b031681526020016103d36060890160408a0161077e565b6001600160a01b031681526020016103f16080890160608a0161077e565b6001600160a01b031681526020810186905260a0880135604082015260c0880135606082015260800161042b610100890160e08a016107e4565b63ffffffff169052604051630d30a25f60e41b81529091506001600160a01b0386169063d30a25f090610462908490600401610807565b5f604051808303815f87803b158015610479575f5ffd5b505af192505050801561048a575060015b6104a757604051633c2732d560e11b815260040160405180910390fd5b5f8481526020818152604080832080546001600160a01b0319166001600160a01b038a16908117909155808452600180845291909320805460ff1916909117905560a08801359086907fccde0c1f72df5fad9354c0557e019f538122c0e3d5d3974f5abbb3cf8523451e907f000000000000000000000000000000000000000000000000000000000000000090610540908c018c61077e565b61055060408d0160208e0161077e565b61056060608e0160408f0161077e565b8d6060016020810190610573919061077e565b8e60c001358f60e001602081019061058b91906107e4565b604080516001600160a01b03988916815296881660208801529487168686015292861660608601529416608084015260a083019390935263ffffffff90921660c082015290519081900360e00190a450505050919050565b5f818152602081905260409020546001600160a01b03168061061b576040516398394dc360e01b8152600481018390526024016102d8565b919050565b5f5f61062b856106d3565b8051602091820120604080516001600160f81b03198185015260609690961b6bffffffffffffffffffffffff19166021870152603586019690965260558086019190915285518086039091018152607590940190945250508051910120919050565b5f5f610698846106d3565b9050828151602083015ff591506001600160a01b0382166106cc57604051633c2732d560e11b815260040160405180910390fd5b5092915050565b604051693d602d80600a3d3981f360b01b602082015269363d3d373d3d3d363d7360b01b602a820152606082811b6bffffffffffffffffffffffff191660348301526e5af43d82803e903d91602b57fd5bf360881b6048830152906057016040516020818303038152906040529050919050565b5f60208284031215610757575f5ffd5b5035919050565b5f5f6040838503121561076f575f5ffd5b50508035926020909101359150565b5f6020828403121561078e575f5ffd5b81356001600160a01b03811681146107a4575f5ffd5b9392505050565b5f6101008284031280156107bd575f5ffd5b509092915050565b5f602082840312156107d5575f5ffd5b815180151581146107a4575f5ffd5b5f602082840312156107f4575f5ffd5b813563ffffffff811681146107a4575f5ffd5b81516001600160a01b039081168252602080840151821690830152604080840151821690830152606080840151821690830152608080840151918216908301526101208201905060a083015160a083015260c083015160c083015260e083015160e08301526101008301516106cc61010084018263ffffffff16905256fea2646970667358221220be7c59705934008e27be9bc93585419ea0bce4d67f981aa923c8263c1253b71264736f6c634300081c0033",
    "deployedBytecode": "0x608060405234801561000f575f5ffd5b506004361061007a575f3560e01c80638589840a116100585780638589840a1461010f578063bf13a9921461013a578063f42eb7651461014d578063f5efbb4f14610160575f5ffd5b80631600a0c81461007e578063204a88c5146100c257806341b258c0146100fc575b5f5ffd5b6100a57f000000000000000000000000000000000000000000000000000000000000000081565b6040516001600160a01b0390911681526020015b60405180910390f35b6100ec6100d0366004610747565b5f908152602081905260409020546001600160a01b0316151590565b60405190151581526020016100b9565b6100a561010a36600461075e565b610187565b6100ec61011d36600461077e565b6001600160a01b03165f9081526001602052604090205460ff1690565b6100a56101483660046107ab565b6101f0565b6100a561015b366004610747565b6105e3565b6100a57f000000000000000000000000000000000000000000000000000000000000000081565b5f5f83836040516020016101a5929190918252602082015260400190565b6040516020818303038152906040528051906020012090506101e87f00000000000000000000000000000000000000000000000000000000000000008230610620565b949350505050565b5f7f00000000000000000000000000000000000000000000000000000000000000006001600160a01b031663d52434f86040518163ffffffff1660e01b8152600401602060405180830381865afa15801561024d573d5f5f3e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061027191906107c5565b1561028f576040516304fb289360e31b815260040160405180910390fd5b60808201355f818152602081905260409020546001600160a01b031680156102e15760405163c06ce9e160e01b8152600481018390526001600160a01b03821660248201526044015b60405180910390fd5b5f828560a00135604051602001610302929190918252602082015260400190565b6040516020818303038152906040528051906020012090506103447f00000000000000000000000000000000000000000000000000000000000000008261068d565b93505f6040518061012001604052807f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03168152602001875f016020810190610394919061077e565b6001600160a01b031681526020018760200160208101906103b5919061077e565b6001600160a01b031681526020016103d36060890160408a0161077e565b6001600160a01b031681526020016103f16080890160608a0161077e565b6001600160a01b031681526020810186905260a0880135604082015260c0880135606082015260800161042b610100890160e08a016107e4565b63ffffffff169052604051630d30a25f60e41b81529091506001600160a01b0386169063d30a25f090610462908490600401610807565b5f604051808303815f87803b158015610479575f5ffd5b505af192505050801561048a575060015b6104a757604051633c2732d560e11b815260040160405180910390fd5b5f8481526020818152604080832080546001600160a01b0319166001600160a01b038a16908117909155808452600180845291909320805460ff1916909117905560a08801359086907fccde0c1f72df5fad9354c0557e019f538122c0e3d5d3974f5abbb3cf8523451e907f000000000000000000000000000000000000000000000000000000000000000090610540908c018c61077e565b61055060408d0160208e0161077e565b61056060608e0160408f0161077e565b8d6060016020810190610573919061077e565b8e60c001358f60e001602081019061058b91906107e4565b604080516001600160a01b03988916815296881660208801529487168686015292861660608601529416608084015260a083019390935263ffffffff90921660c082015290519081900360e00190a450505050919050565b5f818152602081905260409020546001600160a01b03168061061b576040516398394dc360e01b8152600481018390526024016102d8565b919050565b5f5f61062b856106d3565b8051602091820120604080516001600160f81b03198185015260609690961b6bffffffffffffffffffffffff19166021870152603586019690965260558086019190915285518086039091018152607590940190945250508051910120919050565b5f5f610698846106d3565b9050828151602083015ff591506001600160a01b0382166106cc57604051633c2732d560e11b815260040160405180910390fd5b5092915050565b604051693d602d80600a3d3981f360b01b602082015269363d3d373d3d3d363d7360b01b602a820152606082811b6bffffffffffffffffffffffff191660348301526e5af43d82803e903d91602b57fd5bf360881b6048830152906057016040516020818303038152906040529050919050565b5f60208284031215610757575f5ffd5b5035919050565b5f5f6040838503121561076f575f5ffd5b50508035926020909101359150565b5f6020828403121561078e575f5ffd5b81356001600160a01b03811681146107a4575f5ffd5b9392505050565b5f6101008284031280156107bd575f5ffd5b509092915050565b5f602082840312156107d5575f5ffd5b815180151581146107a4575f5ffd5b5f602082840312156107f4575f5ffd5b813563ffffffff811681146107a4575f5ffd5b81516001600160a01b039081168252602080840151821690830152604080840151821690830152606080840151821690830152608080840151918216908301526101208201905060a083015160a083015260c083015160c083015260e083015160e08301526101008301516106cc61010084018263ffffffff16905256fea2646970667358221220be7c59705934008e27be9bc93585419ea0bce4d67f981aa923c8263c1253b71264736f6c634300081c0033"
  }
} as const satisfies Record<ContractName, ContractArtifact>;

export const deploymentManifests: Record<string, DeploymentManifest> = {
  "base-sepolia": {
    "chainId": 84532,
    "network": "base-sepolia",
    "explorerUrl": "https://sepolia.basescan.org",
    "deployedAt": "2026-04-05T06:17:49.519Z",
    "deploymentStartBlock": "39797620",
    "deployer": "0x00e5e8d73a66588ab7fb63383f8f558ba59c929d",
    "owner": "0x00e5e8d73a66588ab7fb63383f8f558ba59c929d",
    "pendingOwner": "0x573b6f6F84cdf764Ee25cCeEA673a4cd259abFDb",
    "treasury": "0x573b6f6F84cdf764Ee25cCeEA673a4cd259abFDb",
    "usdcToken": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "protocolFeeBps": 0,
    "contracts": {
      "TokenAllowlist": "0xa46bb7cc73f292d77e27b27fac6863601ce1d49b",
      "ArbitratorRegistry": "0x968f65ff5627b3581d82c86ab78826e010bdc583",
      "ProtocolConfig": "0x0f133ac8d69a16efab20709479a521880b509613",
      "FeeVault": "0xeca4953857048466bd2958273c9b470c28ecab2e",
      "EscrowAgreement": "0x43292d7fac721139157c69effd18afc6739815f6",
      "EscrowFactory": "0x47ca3d3f2f6a62240c1e1197dabdf45f05534d83"
    }
  }
};

const deploymentManifestsByChainId = new Map<number, DeploymentManifest>(
  Object.values(deploymentManifests).map((manifest) => [manifest.chainId, manifest])
);

export function getContractArtifact(contractName: ContractName): ContractArtifact {
  return contractArtifacts[contractName];
}

export function getDeploymentManifest(network: string): DeploymentManifest | null {
  return deploymentManifests[network] ?? null;
}

export function getDeploymentManifestByChainId(chainId: number): DeploymentManifest | null {
  return deploymentManifestsByChainId.get(chainId) ?? null;
}
