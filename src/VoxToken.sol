// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VoxToken
 * @notice Governance token for VoxDAO on BotChain with ERC20Votes checkpoints
 * @dev Supports cryptographic snapshotting via getPastVotes() to prevent flash-loan
 * and post-proposal voting manipulation attacks. Includes a faucet for testnet/local testing.
 */
contract VoxToken is ERC20, ERC20Permit, ERC20Votes, Ownable {
    uint256 public constant FAUCET_AMOUNT = 1_000 * 1e18; // 1,000 VOX
    uint256 public constant FAUCET_COOLDOWN = 1 days;

    mapping(address => uint256) public lastFaucetRequest;

    event FaucetClaimed(address indexed recipient, uint256 amount);

    error FaucetCooldownActive(uint256 nextAvailable);
    error ExceedsMaxClaim(uint256 requested, uint256 maximum);

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address initialOwner
    ) ERC20(name, symbol) ERC20Permit(name) Ownable(initialOwner) {
        if (initialSupply > 0) {
            _mint(initialOwner, initialSupply);
            // Automatically delegate voting power to the initial owner so they can govern right away
            _delegate(initialOwner, initialOwner);
        }
    }

    /**
     * @notice Allows testnet and local users to claim tokens and automatically activates their voting power
     * @param recipient The address receiving the tokens
     */
    function claimFaucet(address recipient) external {
        if (lastFaucetRequest[recipient] != 0 && block.timestamp < lastFaucetRequest[recipient] + FAUCET_COOLDOWN) {
            revert FaucetCooldownActive(lastFaucetRequest[recipient] + FAUCET_COOLDOWN);
        }

        lastFaucetRequest[recipient] = block.timestamp;
        _mint(recipient, FAUCET_AMOUNT);

        // Auto-delegate to self if the user has no delegate set yet
        if (delegates(recipient) == address(0)) {
            _delegate(recipient, recipient);
        }

        emit FaucetClaimed(recipient, FAUCET_AMOUNT);
    }

    /**
     * @notice Allows the contract owner to mint tokens for governance distribution
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // Required overrides by Solidity for ERC20Votes and Nonces
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);
    }

    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}
