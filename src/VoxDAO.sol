// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {VoxToken} from "./VoxToken.sol";

/**
 * @title VoxDAO
 * @notice Transparent on-chain community governance contract on BotChain
 * @dev Enforces strict lifecycle (Pending -> Active -> Ended -> Finalized -> Executed),
 * cryptographic snapshot checkpoints via ERC20Votes, quorum rules, double-vote prevention,
 * and direct storage view functions optimized for networks with getLogs restrictions.
 */
contract VoxDAO is ReentrancyGuard, Ownable {
    // --- Enums & Structs ---

    enum ProposalState {
        Pending,
        Active,
        Canceled,
        Defeated,
        Succeeded,
        Finalized,
        Executed
    }

    enum VoteType {
        Against,
        For,
        Abstain
    }

    struct Proposal {
        uint256 id;
        address proposer;
        string title;
        string description;
        string category; // "General", "Treasury", "Protocol", "Community"
        uint256 startBlock; // Checkpoint block for voting power snapshot
        uint256 startTime;  // Timestamp when voting begins
        uint256 endTime;    // Timestamp when voting concludes
        uint256 quorum;     // Minimum total votes required
        uint256 minVotingPower; // Minimum voting power required to cast a vote
        address target;     // Optional execution target address
        uint256 value;      // Value in native BOT to transfer upon execution
        bytes callData;     // Optional calldata for execution
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        uint256 totalVoters;
        bool finalized;
        bool passed;
        bool executed;
        bool canceled;
    }

    struct VoteReceipt {
        bool hasVoted;
        VoteType support;
        uint256 weight;
        uint256 timestamp;
        string reason;
    }

    // --- State Variables ---

    VoxToken public immutable voxToken;

    string public daoName;
    string public daoDescription;

    uint256 public proposalCount;
    uint256 public proposalThreshold; // Minimum voting power to submit a proposal (e.g. 100 VOX)
    uint256 public votingDelay;       // Delay in seconds before voting starts (0 for instant)
    uint256 public minVotingPeriod;   // Minimum voting duration in seconds (e.g. 60s for demo, days for prod)
    uint256 public defaultQuorum;     // Default quorum required (e.g. 500 VOX)

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => VoteReceipt)) public receipts;

    // --- Events ---

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string title,
        string category,
        uint256 startBlock,
        uint256 startTime,
        uint256 endTime,
        uint256 quorum,
        address target,
        uint256 value
    );

    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        uint8 support,
        uint256 weight,
        string reason
    );

    event ProposalFinalized(
        uint256 indexed proposalId,
        bool passed,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes
    );

    event ProposalExecuted(
        uint256 indexed proposalId,
        address indexed target,
        uint256 value
    );

    event ProposalCanceled(uint256 indexed proposalId);

    event GovernanceParametersUpdated(
        uint256 proposalThreshold,
        uint256 votingDelay,
        uint256 minVotingPeriod,
        uint256 defaultQuorum
    );

    // --- Custom Errors ---

    error ProposerBelowThreshold(uint256 votingPower, uint256 threshold);
    error InvalidVotingPeriod(uint256 duration, uint256 minDuration);
    error ProposalNotFound(uint256 proposalId);
    error InvalidProposalState(ProposalState current, ProposalState expected);
    error AlreadyVoted(address voter, uint256 proposalId);
    error VotingNotStarted(uint256 currentTime, uint256 startTime);
    error VotingAlreadyEnded(uint256 currentTime, uint256 endTime);
    error VotingPeriodActive(uint256 currentTime, uint256 endTime);
    error VotingPowerZero(address voter);
    error VotingPowerBelowMinimum(uint256 votingPower, uint256 minPower);
    error ProposalAlreadyFinalized(uint256 proposalId);
    error ProposalNotPassed(uint256 proposalId);
    error ProposalAlreadyExecuted(uint256 proposalId);
    error ExecutionFailed(address target, bytes data);
    error Unauthorized();
    error EmptyTitle();

    constructor(
        address _voxToken,
        string memory _daoName,
        string memory _daoDescription,
        uint256 _proposalThreshold,
        uint256 _votingDelay,
        uint256 _minVotingPeriod,
        uint256 _defaultQuorum,
        address _admin
    ) Ownable(_admin) {
        require(_voxToken != address(0), "Invalid token address");
        voxToken = VoxToken(_voxToken);
        daoName = _daoName;
        daoDescription = _daoDescription;
        proposalThreshold = _proposalThreshold;
        votingDelay = _votingDelay;
        minVotingPeriod = _minVotingPeriod;
        defaultQuorum = _defaultQuorum;
    }

    receive() external payable {}

    // --- Core Governance Functions ---

    /**
     * @notice Creates a new governance proposal
     * @dev Proposer must hold at least proposalThreshold voting power at creation time
     */
    function createProposal(
        string memory title,
        string memory description,
        string memory category,
        uint256 duration,
        uint256 customQuorum,
        address target,
        uint256 value,
        bytes memory callData
    ) external returns (uint256) {
        if (bytes(title).length == 0) revert EmptyTitle();
        if (duration < minVotingPeriod) revert InvalidVotingPeriod(duration, minVotingPeriod);

        // Verify proposer has sufficient current voting power
        uint256 proposerPower = voxToken.getVotes(msg.sender);
        if (proposerPower < proposalThreshold) {
            revert ProposerBelowThreshold(proposerPower, proposalThreshold);
        }

        uint256 proposalId = ++proposalCount;
        uint256 snapshotBlock = block.number > 0 ? block.number - 1 : 0;
        uint256 start = block.timestamp + votingDelay;
        uint256 end = start + duration;
        uint256 quorum = customQuorum >= defaultQuorum ? customQuorum : defaultQuorum;

        proposals[proposalId] = Proposal({
            id: proposalId,
            proposer: msg.sender,
            title: title,
            description: description,
            category: category,
            startBlock: snapshotBlock,
            startTime: start,
            endTime: end,
            quorum: quorum,
            minVotingPower: 1e18, // Minimum 1 VOX to participate
            target: target,
            value: value,
            callData: callData,
            forVotes: 0,
            againstVotes: 0,
            abstainVotes: 0,
            totalVoters: 0,
            finalized: false,
            passed: false,
            executed: false,
            canceled: false
        });

        emit ProposalCreated(
            proposalId,
            msg.sender,
            title,
            category,
            snapshotBlock,
            start,
            end,
            quorum,
            target,
            value
        );

        return proposalId;
    }

    /**
     * @notice Cast a vote on an active proposal
     */
    function castVote(uint256 proposalId, VoteType support) external returns (uint256) {
        return _castVoteInternal(proposalId, msg.sender, support, "");
    }

    /**
     * @notice Cast a vote with a public justification reason
     */
    function castVoteWithReason(
        uint256 proposalId,
        VoteType support,
        string calldata reason
    ) external returns (uint256) {
        return _castVoteInternal(proposalId, msg.sender, support, reason);
    }

    function _castVoteInternal(
        uint256 proposalId,
        address voter,
        VoteType support,
        string memory reason
    ) internal returns (uint256) {
        Proposal storage p = proposals[proposalId];
        if (p.id == 0) revert ProposalNotFound(proposalId);
        if (p.canceled) revert InvalidProposalState(ProposalState.Canceled, ProposalState.Active);
        if (block.timestamp < p.startTime) revert VotingNotStarted(block.timestamp, p.startTime);
        if (block.timestamp > p.endTime) revert VotingAlreadyEnded(block.timestamp, p.endTime);
        if (receipts[proposalId][voter].hasVoted) revert AlreadyVoted(voter, proposalId);

        // Snapshot verification: determine voter's voting power at proposal startBlock
        uint256 weight = voxToken.getPastVotes(voter, p.startBlock);
        if (weight == 0) revert VotingPowerZero(voter);
        if (weight < p.minVotingPower) revert VotingPowerBelowMinimum(weight, p.minVotingPower);

        receipts[proposalId][voter] = VoteReceipt({
            hasVoted: true,
            support: support,
            weight: weight,
            timestamp: block.timestamp,
            reason: reason
        });

        if (support == VoteType.Against) {
            p.againstVotes += weight;
        } else if (support == VoteType.For) {
            p.forVotes += weight;
        } else if (support == VoteType.Abstain) {
            p.abstainVotes += weight;
        }

        p.totalVoters += 1;

        emit VoteCast(voter, proposalId, uint8(support), weight, reason);
        return weight;
    }

    /**
     * @notice Finalizes a proposal once the voting period has elapsed
     * @dev Permanently calculates the outcome and locks results on-chain. Cannot be altered once finalized.
     */
    function finalizeProposal(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        if (p.id == 0) revert ProposalNotFound(proposalId);
        if (p.finalized) revert ProposalAlreadyFinalized(proposalId);
        if (p.canceled) revert InvalidProposalState(ProposalState.Canceled, ProposalState.Active);
        if (block.timestamp <= p.endTime) revert VotingPeriodActive(block.timestamp, p.endTime);

        p.finalized = true;

        uint256 totalVotes = p.forVotes + p.againstVotes + p.abstainVotes;
        bool quorumMet = totalVotes >= p.quorum;
        bool majorityWon = p.forVotes > p.againstVotes;

        p.passed = quorumMet && majorityWon;

        emit ProposalFinalized(proposalId, p.passed, p.forVotes, p.againstVotes, p.abstainVotes);
    }

    /**
     * @notice Executes a passed proposal (e.g. treasury disbursement or contract call)
     */
    function executeProposal(uint256 proposalId) external nonReentrant {
        Proposal storage p = proposals[proposalId];
        if (p.id == 0) revert ProposalNotFound(proposalId);
        if (!p.finalized) revert InvalidProposalState(state(proposalId), ProposalState.Finalized);
        if (!p.passed) revert ProposalNotPassed(proposalId);
        if (p.executed) revert ProposalAlreadyExecuted(proposalId);

        p.executed = true;

        if (p.target != address(0)) {
            if (p.value > 0) {
                require(address(this).balance >= p.value, "Insufficient DAO treasury balance");
            }

            (bool success, bytes memory returndata) = p.target.call{value: p.value}(p.callData);
            if (!success) {
                revert ExecutionFailed(p.target, returndata);
            }
        }

        emit ProposalExecuted(proposalId, p.target, p.value);
    }

    /**
     * @notice Proposer or DAO Admin can cancel a proposal before it ends
     */
    function cancelProposal(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        if (p.id == 0) revert ProposalNotFound(proposalId);
        if (msg.sender != p.proposer && msg.sender != owner()) revert Unauthorized();
        if (p.finalized || p.executed) revert ProposalAlreadyFinalized(proposalId);

        p.canceled = true;
        emit ProposalCanceled(proposalId);
    }

    // --- Admin Governance Parameter Management ---

    function updateGovernanceParameters(
        uint256 _proposalThreshold,
        uint256 _votingDelay,
        uint256 _minVotingPeriod,
        uint256 _defaultQuorum
    ) external onlyOwner {
        proposalThreshold = _proposalThreshold;
        votingDelay = _votingDelay;
        minVotingPeriod = _minVotingPeriod;
        defaultQuorum = _defaultQuorum;

        emit GovernanceParametersUpdated(
            _proposalThreshold,
            _votingDelay,
            _minVotingPeriod,
            _defaultQuorum
        );
    }

    // --- Direct View Functions (Zero-Dependency & getLogs-Independent) ---

    /**
     * @notice Returns the live lifecycle state of a proposal
     */
    function state(uint256 proposalId) public view returns (ProposalState) {
        Proposal storage p = proposals[proposalId];
        if (p.id == 0) revert ProposalNotFound(proposalId);

        if (p.canceled) {
            return ProposalState.Canceled;
        } else if (p.executed) {
            return ProposalState.Executed;
        } else if (p.finalized) {
            return p.passed ? ProposalState.Succeeded : ProposalState.Defeated;
        } else if (block.timestamp < p.startTime) {
            return ProposalState.Pending;
        } else if (block.timestamp <= p.endTime) {
            return ProposalState.Active;
        } else {
            // Voting concluded but not yet finalized
            uint256 totalVotes = p.forVotes + p.againstVotes + p.abstainVotes;
            if (totalVotes >= p.quorum && p.forVotes > p.againstVotes) {
                return ProposalState.Succeeded;
            } else {
                return ProposalState.Defeated;
            }
        }
    }

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        if (proposals[proposalId].id == 0) revert ProposalNotFound(proposalId);
        return proposals[proposalId];
    }

    function getProposalVotes(uint256 proposalId)
        external
        view
        returns (
            uint256 forVotes,
            uint256 againstVotes,
            uint256 abstainVotes,
            uint256 totalVoters
        )
    {
        Proposal storage p = proposals[proposalId];
        return (p.forVotes, p.againstVotes, p.abstainVotes, p.totalVoters);
    }

    function getReceipt(uint256 proposalId, address voter) external view returns (VoteReceipt memory) {
        return receipts[proposalId][voter];
    }

    function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
        return receipts[proposalId][voter].hasVoted;
    }

    function getVotingPower(address account, uint256 proposalId) external view returns (uint256) {
        Proposal storage p = proposals[proposalId];
        if (p.id == 0) return voxToken.getVotes(account);
        return voxToken.getPastVotes(account, p.startBlock);
    }

    /**
     * @notice Fetches paginated proposals directly from contract storage
     */
    function getProposals(uint256 offset, uint256 limit)
        external
        view
        returns (Proposal[] memory list, uint256 total)
    {
        total = proposalCount;
        if (offset >= total) {
            return (new Proposal[](0), total);
        }

        uint256 to = offset + limit;
        if (to > total) {
            to = total;
        }
        uint256 size = to - offset;
        list = new Proposal[](size);

        for (uint256 i = 0; i < size; i++) {
            // Proposals indexed 1..total, latest first
            uint256 pId = total - (offset + i);
            list[i] = proposals[pId];
        }

        return (list, total);
    }

    /**
     * @notice Returns comprehensive DAO statistics for dashboard
     */
    function getDAOOverview()
        external
        view
        returns (
            uint256 totalProposals,
            uint256 activeProposals,
            uint256 totalVotingSupply,
            uint256 currentQuorum,
            uint256 minThreshold,
            address tokenAddress,
            uint256 treasuryBalance
        )
    {
        uint256 activeCount = 0;
        for (uint256 i = 1; i <= proposalCount; i++) {
            if (
                !proposals[i].canceled &&
                !proposals[i].finalized &&
                block.timestamp >= proposals[i].startTime &&
                block.timestamp <= proposals[i].endTime
            ) {
                activeCount++;
            }
        }

        return (
            proposalCount,
            activeCount,
            voxToken.totalSupply(),
            defaultQuorum,
            proposalThreshold,
            address(voxToken),
            address(this).balance
        );
    }
}
