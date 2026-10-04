// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {VoxToken} from "../src/VoxToken.sol";
import {VoxDAO} from "../src/VoxDAO.sol";

contract MockTreasuryReceiver {
    uint256 public fundsReceived;

    receive() external payable {
        fundsReceived += msg.value;
    }
}

contract VoxDAOTest is Test {
    VoxToken public token;
    VoxDAO public dao;
    MockTreasuryReceiver public receiver;

    address public admin = address(0xAD);
    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);
    address public charlie = address(0xCAFE);
    address public eve = address(0xE5E);

    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 1e18; // 1M VOX
    uint256 public constant PROPOSAL_THRESHOLD = 100 * 1e18;   // 100 VOX
    uint256 public constant VOTING_DELAY = 10;                // 10 seconds
    uint256 public constant MIN_VOTING_PERIOD = 60;           // 60 seconds
    uint256 public constant DEFAULT_QUORUM = 500 * 1e18;      // 500 VOX

    function setUp() public {
        vm.startPrank(admin);

        // Deploy VoxToken
        token = new VoxToken("Vox Governance Token", "VOX", INITIAL_SUPPLY, admin);

        // Deploy VoxDAO
        dao = new VoxDAO(
            address(token),
            "VoxDAO Community",
            "Decentralized Community Governance on BotChain",
            PROPOSAL_THRESHOLD,
            VOTING_DELAY,
            MIN_VOTING_PERIOD,
            DEFAULT_QUORUM,
            admin
        );

        // Deploy Treasury mock receiver
        receiver = new MockTreasuryReceiver();

        // Fund DAO with 10 native ETH/BOT for treasury tests
        vm.deal(address(dao), 10 ether);

        // Distribute tokens to test participants
        token.transfer(alice, 10_000 * 1e18);
        token.transfer(bob, 5_000 * 1e18);

        vm.stopPrank();

        // Alice and Bob delegate voting power to themselves (standard ERC20Votes requirement)
        vm.prank(alice);
        token.delegate(alice);

        vm.prank(bob);
        token.delegate(bob);

        // Roll forward 1 block so checkpoints are active
        vm.roll(block.number + 1);
    }

    // --- Proposal Tests ---

    function test_CreateProposal_Success() public {
        vm.prank(alice);
        uint256 proposalId = dao.createProposal(
            "Fund BotChain Community Hackathon",
            "Allocate 2 BOT to sponsor community developers",
            "Treasury",
            1 days,
            DEFAULT_QUORUM,
            address(receiver),
            2 ether,
            ""
        );

        assertEq(proposalId, 1);
        VoxDAO.Proposal memory p = dao.getProposal(1);
        assertEq(p.id, 1);
        assertEq(p.proposer, alice);
        assertEq(p.title, "Fund BotChain Community Hackathon");
        assertEq(p.category, "Treasury");
        assertEq(p.value, 2 ether);
        assertFalse(p.finalized);
        assertFalse(p.passed);
        assertEq(uint256(dao.state(1)), uint256(VoxDAO.ProposalState.Pending));
    }

    function test_CreateProposal_Revert_ProposerBelowThreshold() public {
        // Charlie has 0 tokens
        vm.prank(charlie);
        vm.expectRevert(
            abi.encodeWithSelector(
                VoxDAO.ProposerBelowThreshold.selector,
                0,
                PROPOSAL_THRESHOLD
            )
        );
        dao.createProposal("Spam Proposal", "No tokens", "General", 1 days, 0, address(0), 0, "");
    }

    function test_CreateProposal_Revert_InvalidVotingPeriod() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                VoxDAO.InvalidVotingPeriod.selector,
                30,
                MIN_VOTING_PERIOD
            )
        );
        dao.createProposal("Quick Vote", "Too short", "General", 30, 0, address(0), 0, "");
    }

    function test_CreateProposal_Revert_EmptyTitle() public {
        vm.prank(alice);
        vm.expectRevert(VoxDAO.EmptyTitle.selector);
        dao.createProposal("", "No title", "General", 1 days, 0, address(0), 0, "");
    }

    // --- Voting & Snapshot Tests ---

    function test_Voting_FullLifecycle_And_SnapshotDefense() public {
        // Alice creates proposal
        vm.prank(alice);
        uint256 pId = dao.createProposal(
            "Protocol Parameter Update",
            "Update governance delay",
            "Protocol",
            2 days,
            DEFAULT_QUORUM,
            address(0),
            0,
            ""
        );

        // Before start time, voting must revert
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                VoxDAO.VotingNotStarted.selector,
                block.timestamp,
                block.timestamp + VOTING_DELAY
            )
        );
        dao.castVote(pId, VoxDAO.VoteType.For);

        // Advance time to Active window
        vm.warp(block.timestamp + VOTING_DELAY + 1);
        assertEq(uint256(dao.state(pId)), uint256(VoxDAO.ProposalState.Active));

        // Alice votes For (10,000 VOX)
        vm.prank(alice);
        uint256 aliceWeight = dao.castVote(pId, VoxDAO.VoteType.For);
        assertEq(aliceWeight, 10_000 * 1e18);

        // Bob votes Against (5,000 VOX)
        vm.prank(bob);
        uint256 bobWeight = dao.castVoteWithReason(pId, VoxDAO.VoteType.Against, "Disagree with parameter");
        assertEq(bobWeight, 5_000 * 1e18);

        // Alice tries to double-vote -> must revert
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(VoxDAO.AlreadyVoted.selector, alice, pId)
        );
        dao.castVote(pId, VoxDAO.VoteType.For);

        // CRITICAL SNAPSHOT TEST:
        // Eve acquires 50,000 VOX *AFTER* proposal start block was snapshotted
        vm.prank(admin);
        token.transfer(eve, 50_000 * 1e18);
        vm.prank(eve);
        token.delegate(eve);
        vm.roll(block.number + 1);

        // Eve attempts to vote with newly acquired tokens
        // Must revert because snapshot voting power at proposal startBlock was 0!
        vm.prank(eve);
        vm.expectRevert(
            abi.encodeWithSelector(VoxDAO.VotingPowerZero.selector, eve)
        );
        dao.castVote(pId, VoxDAO.VoteType.Against);

        // Advance time past proposal end
        VoxDAO.Proposal memory prop = dao.getProposal(pId);
        vm.warp(prop.endTime + 1);

        // Voting after end must revert
        vm.prank(charlie);
        vm.expectRevert(
            abi.encodeWithSelector(
                VoxDAO.VotingAlreadyEnded.selector,
                block.timestamp,
                prop.endTime
            )
        );
        dao.castVote(pId, VoxDAO.VoteType.For);

        // Finalize proposal
        dao.finalizeProposal(pId);

        VoxDAO.Proposal memory finalizedProp = dao.getProposal(pId);
        assertTrue(finalizedProp.finalized);
        assertTrue(finalizedProp.passed); // 10,000 For > 5,000 Against, Total 15,000 > Quorum 500
        assertEq(uint256(dao.state(pId)), uint256(VoxDAO.ProposalState.Succeeded));

        // Re-finalizing must revert
        vm.expectRevert(
            abi.encodeWithSelector(VoxDAO.ProposalAlreadyFinalized.selector, pId)
        );
        dao.finalizeProposal(pId);
    }

    // --- Quorum & Defeat Tests ---

    function test_Proposal_Defeated_When_QuorumNotMet() public {
        // Create proposal with a very high custom quorum
        vm.prank(alice);
        uint256 pId = dao.createProposal(
            "High Quorum Proposal",
            "Needs massive consensus",
            "General",
            1 days,
            50_000 * 1e18, // 50k VOX quorum
            address(0),
            0,
            ""
        );

        vm.warp(block.timestamp + VOTING_DELAY + 1);

        // Bob votes For with 5k VOX (below 50k quorum)
        vm.prank(bob);
        dao.castVote(pId, VoxDAO.VoteType.For);

        // End proposal
        VoxDAO.Proposal memory p = dao.getProposal(pId);
        vm.warp(p.endTime + 1);

        dao.finalizeProposal(pId);

        VoxDAO.Proposal memory finalizedProp = dao.getProposal(pId);
        assertTrue(finalizedProp.finalized);
        assertFalse(finalizedProp.passed); // Failed due to quorum
        assertEq(uint256(dao.state(pId)), uint256(VoxDAO.ProposalState.Defeated));
    }

    function test_Proposal_Defeated_When_MajorityAgainst() public {
        vm.prank(alice);
        uint256 pId = dao.createProposal(
            "Controversial Action",
            "Test Against vote win",
            "General",
            1 days,
            DEFAULT_QUORUM,
            address(0),
            0,
            ""
        );

        vm.warp(block.timestamp + VOTING_DELAY + 1);

        // Alice votes Against (10,000 VOX)
        vm.prank(alice);
        dao.castVote(pId, VoxDAO.VoteType.Against);

        // Bob votes For (5,000 VOX)
        vm.prank(bob);
        dao.castVote(pId, VoxDAO.VoteType.For);

        VoxDAO.Proposal memory p = dao.getProposal(pId);
        vm.warp(p.endTime + 1);

        dao.finalizeProposal(pId);

        VoxDAO.Proposal memory finalizedProp = dao.getProposal(pId);
        assertTrue(finalizedProp.finalized);
        assertFalse(finalizedProp.passed); // 10k Against > 5k For
        assertEq(uint256(dao.state(pId)), uint256(VoxDAO.ProposalState.Defeated));
    }

    // --- Execution Tests ---

    function test_ExecuteProposal_TreasuryDisbursement() public {
        vm.prank(alice);
        uint256 pId = dao.createProposal(
            "Treasury Grant",
            "Send 3 BOT to developer receiver",
            "Treasury",
            1 days,
            DEFAULT_QUORUM,
            address(receiver),
            3 ether,
            ""
        );

        vm.warp(block.timestamp + VOTING_DELAY + 1);

        vm.prank(alice);
        dao.castVote(pId, VoxDAO.VoteType.For);

        VoxDAO.Proposal memory p = dao.getProposal(pId);
        vm.warp(p.endTime + 1);

        dao.finalizeProposal(pId);

        // Verify receiver balance before
        assertEq(receiver.fundsReceived(), 0);

        // Execute proposal
        dao.executeProposal(pId);

        // Verify receiver balance after
        assertEq(receiver.fundsReceived(), 3 ether);
        assertEq(address(receiver).balance, 3 ether);

        VoxDAO.Proposal memory executedProp = dao.getProposal(pId);
        assertTrue(executedProp.executed);
        assertEq(uint256(dao.state(pId)), uint256(VoxDAO.ProposalState.Executed));

        // Re-executing must revert
        vm.expectRevert(
            abi.encodeWithSelector(VoxDAO.ProposalAlreadyExecuted.selector, pId)
        );
        dao.executeProposal(pId);
    }

    // --- Faucet Tests ---

    function test_Faucet_Claim_And_AutoDelegate() public {
        assertEq(token.balanceOf(charlie), 0);
        assertEq(token.getVotes(charlie), 0);

        token.claimFaucet(charlie);

        assertEq(token.balanceOf(charlie), 1_000 * 1e18);
        // Automatically delegated to self
        assertEq(token.delegates(charlie), charlie);
        assertEq(token.getVotes(charlie), 1_000 * 1e18);

        // Requesting again immediately reverts cooldown
        vm.expectRevert();
        token.claimFaucet(charlie);
    }

    // --- Cancellation Tests ---

    function test_CancelProposal_ByProposer() public {
        vm.prank(alice);
        uint256 pId = dao.createProposal(
            "Mistaken Proposal",
            "Details to cancel",
            "General",
            1 days,
            DEFAULT_QUORUM,
            address(0),
            0,
            ""
        );

        // Alice cancels
        vm.prank(alice);
        dao.cancelProposal(pId);

        VoxDAO.Proposal memory p = dao.getProposal(pId);
        assertTrue(p.canceled);
        assertEq(uint256(dao.state(pId)), uint256(VoxDAO.ProposalState.Canceled));

        // Voting on canceled proposal must revert
        vm.warp(block.timestamp + VOTING_DELAY + 1);
        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(
                VoxDAO.InvalidProposalState.selector,
                VoxDAO.ProposalState.Canceled,
                VoxDAO.ProposalState.Active
            )
        );
        dao.castVote(pId, VoxDAO.VoteType.For);
    }

    // --- Direct View Functions Test ---

    function test_DirectViewFunctions() public {
        vm.prank(alice);
        dao.createProposal("P1", "D1", "General", 1 days, 0, address(0), 0, "");

        vm.prank(alice);
        dao.createProposal("P2", "D2", "Treasury", 2 days, 0, address(0), 0, "");

        (VoxDAO.Proposal[] memory list, uint256 total) = dao.getProposals(0, 10);
        assertEq(total, 2);
        assertEq(list.length, 2);
        assertEq(list[0].id, 2); // Latest first
        assertEq(list[1].id, 1);

        (
            uint256 totalProposals,
            uint256 activeProposals,
            uint256 totalVotingSupply,
            uint256 currentQuorum,
            uint256 minThreshold,
            address tokenAddress,
            uint256 treasuryBalance
        ) = dao.getDAOOverview();

        assertEq(totalProposals, 2);
        assertEq(totalVotingSupply, INITIAL_SUPPLY);
        assertEq(currentQuorum, DEFAULT_QUORUM);
        assertEq(minThreshold, PROPOSAL_THRESHOLD);
        assertEq(tokenAddress, address(token));
        assertEq(treasuryBalance, 10 ether);
    }
}
