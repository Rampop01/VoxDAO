# VoxDAO

> **Your community. Your vote. On-chain.**

VoxDAO is a decentralized, on-chain community governance platform designed and deployed on **BotChain**. It enables DAOs, protocol teams, and decentralized communities to submit proposals, verify voting eligibility via cryptographic checkpoints, vote transparently, and permanently record and enforce finalized outcomes on-chain.

VoxDAO pairs immutable smart-contract governance with **Vox Assistant**, an auditable AI governance copilot designed to empower human decision-makers without ever compromising governance integrity.

---

## Core Product Principle

> *Communities should be able to make decisions transparently without relying on centralized polling systems.*

* **The blockchain is the source of truth:** All proposals, snapshot voting power checkpoints, votes, and finalizations are stored permanently on BotChain.
* **The AI assists the community:** Humans make decisions; the blockchain enforces them.
* **AI Safety Boundary:** Vox Assistant is an informational and draft-preparation layer. It **never** casts votes, holds private keys, changes results, or executes treasury transactions without explicit human authorization.

---

## BotChain Ecosystem Verification

| Parameter | BotChain Testnet (Verified) | BotChain Mainnet (Verified) |
| :--- | :--- | :--- |
| **Network Name** | BOT Chain Testnet | BOT Chain Mainnet |
| **Chain ID** | `968` (`0x3c8`) | `677` (`0x2a5`) |
| **RPC Endpoint** | `https://rpc.bohr.life` | `https://rpc.botchain.ai` |
| **Block Explorer** | [scan.bohr.life](https://scan.bohr.life/) | [scan.botchain.ai](https://scan.botchain.ai/) |
| **Native Currency** | BOT (tBOT, 18 decimals) | BOT (18 decimals) |
| **Consensus / Architecture**| Parlia PoS (EVM, Geth JSON-RPC API, EIP-4844 Blob support) | Parlia PoS (EVM, Geth JSON-RPC API, EIP-4844 Blob support) |
| **Public Faucet** | [faucet.botchain.ai/basic](https://faucet.botchain.ai/basic) | Official DEX Swaps |

> **Architectural Finding on `eth_getLogs`:**
> BOT Chain developer documentation explicitly notes that `eth_getLogs` is disabled or restricted on default public RPCs. Accordingly, VoxDAO's smart contracts implement zero-dependency **direct storage view functions** (`getDAOOverview`, `getProposals`, `getProposal`, `getProposalVotes`, `getReceipt`, `hasVoted`, `getVotingPower`). The frontend reads contract state directly via `eth_call`, ensuring 100% reliability and eliminating indexer desync risks.

---

## Deployed & Verified Contracts on BotChain Testnet

* **Network:** BOT Chain Testnet (Chain ID: `968`)
* **RPC Endpoint:** `https://rpc.bohr.life`
* **Explorer Base URL:** `https://scan.bohr.life`

| Contract / Action | Address / Transaction Hash | Explorer Link |
| :--- | :--- | :--- |
| **VoxToken (VOX)** | `0xce1d3e246ea627534c899651672fd7d2cddbab56` | [View on BotScan](https://scan.bohr.life/address/0xce1d3e246ea627534c899651672fd7d2cddbab56) |
| *Deploy Tx* | `0xc1bbf275a112777607323cd2525a1aaa9b82c65d350dee4638a1c46832abf012` | [View Tx](https://scan.bohr.life/tx/0xc1bbf275a112777607323cd2525a1aaa9b82c65d350dee4638a1c46832abf012) |
| **VoxDAO** | `0xc420dd65a7b3aa2c231f85ae9de7d7207013775c` | [View on BotScan](https://scan.bohr.life/address/0xc420dd65a7b3aa2c231f85ae9de7d7207013775c) |
| *Deploy Tx* | `0x3f486119965167a263f76da173af659c6d129af4297e9c32f3f0680dc5fc16af` | [View Tx](https://scan.bohr.life/tx/0x3f486119965167a263f76da173af659c6d129af4297e9c32f3f0680dc5fc16af) |
| **Treasury Funding (0.1 BOT)** | `0x8d670462f48f297d3c75f85ef80aece9aad7d5610fc92b55478d3d7ad406699b` | [View Tx](https://scan.bohr.life/tx/0x8d670462f48f297d3c75f85ef80aece9aad7d5610fc92b55478d3d7ad406699b) |
| **Proposal #1 Creation** | `0x11ab5532652359fa5582871727337f48a467b557309e3b8959d9b285833e3a03` | [View Tx](https://scan.bohr.life/tx/0x11ab5532652359fa5582871727337f48a467b557309e3b8959d9b285833e3a03) |
| **On-Chain Vote Recorded** | `0xa9780ae115989cb485e267f9851514f1610ae611c428c2d55f582702d48e0db5` | [View Tx](https://scan.bohr.life/tx/0xa9780ae115989cb485e267f9851514f1610ae611c428c2d55f582702d48e0db5) |

---

## Key Features

### 1. Cryptographic Snapshot Voting Power
* Implements OpenZeppelin `ERC20Votes` with binary-searchable block checkpoints.
* When a proposal is created at block $N$, the snapshot block is set to $N - 1$.
* **Defense against Flash-Loans & Vote-Buying:** Anyone acquiring or borrowing tokens at block $N$ or later receives **0 voting power** on that proposal. This has been proven and tested in `test/VoxDAO.t.sol::test_Voting_FullLifecycle_And_SnapshotDefense`.

### 2. Strict On-Chain Lifecycle
```text
Pending  ──>  Active  ──>  Ended  ──>  Finalized  ──>  Executed
```
* **Pending:** Proposal submitted; voting begins after `votingDelay`.
* **Active:** Voting window open; eligible voters cast `For`, `Against`, or `Abstain` with optional on-chain reasons.
* **Ended:** Voting closed; waiting for anyone to trigger permanent finalization.
* **Finalized:** Result locked on-chain forever. Checks `forVotes + againstVotes + abstainVotes >= quorum` and `forVotes > againstVotes`.
* **Executed:** If passed and an action target was attached, the contract executes the call with reentrancy protection.

### 3. Faucet & Auto-Delegation for Smooth Onboarding
* `claimFaucet(address recipient)` allows any community tester to mint 1,000 VOX test tokens (24h cooldown).
* Automatically calls `_delegate(recipient, recipient)` if the user has no delegate set, granting immediate checkpointed voting power without confusing multi-step setup.

### 4. Vox Assistant (AI Governance Copilot)
* **Proposal Builder:** Turns natural-language requests into formatted governance drafts with title, description, category, suggested voting window, and risk considerations.
* **Proposal Summarizer:** Produces objective breakdowns (What is proposed, Why, Potential Benefits, Potential Risks).
* **Proposal Explainer:** Beginner-friendly plain-English breakdown of technical parameters and execution calls.
* **Governance Q&A:** Queries live smart-contract state to answer questions like *"Am I eligible to vote?"*, *"How much voting power do I have?"*, and *"When does this proposal end?"*.
* **Proposal Comparison:** Impartial side-by-side comparison of proposals preserving voter autonomy.
* **Clear Badge Separation:** Verified on-chain data displays with verified state badges; AI interpretations display with clear AI badges.

---

## Smart Contract Test Suite

The project includes a comprehensive Foundry test suite covering unit tests, snapshot defense, quorum rules, tie handling, execution, and security bounds:

```bash
forge test -vvv
```

### Test Results
```text
Ran 11 tests for test/VoxDAO.t.sol:VoxDAOTest
[PASS] test_CancelProposal_ByProposer() (gas: 339649)
[PASS] test_CreateProposal_Revert_EmptyTitle() (gas: 13454)
[PASS] test_CreateProposal_Revert_InvalidVotingPeriod() (gas: 15995)
[PASS] test_CreateProposal_Revert_ProposerBelowThreshold() (gas: 24187)
[PASS] test_CreateProposal_Success() (gas: 445964)
[PASS] test_DirectViewFunctions() (gas: 582083)
[PASS] test_ExecuteProposal_TreasuryDisbursement() (gas: 574284)
[PASS] test_Faucet_Claim_And_AutoDelegate() (gas: 177012)
[PASS] test_Proposal_Defeated_When_MajorityAgainst() (gas: 568261)
[PASS] test_Proposal_Defeated_When_QuorumNotMet() (gas: 471298)
[PASS] test_Voting_FullLifecycle_And_SnapshotDefense() (gas: 759521)
Suite result: ok. 11 passed; 0 failed; 0 skipped
```

---

## Local Development & Running the Application

### Prerequisites
* Node.js v18+
* Foundry (`forge`, `cast`)
* An EVM wallet (MetaMask, BO Wallet, or TokenPocket)

### Setup & Build
```bash
# 1. Clone repository
git clone https://github.com/your-username/VoxDAO.git
cd VoxDAO

# 2. Install dependencies
npm install

# 3. Compile contracts
forge build
```

### Run the Web Application
```bash
# Serve the app locally
python3 -m http.server 3333 --directory app
```
Open **[http://localhost:3333/](http://localhost:3333/)** in your browser.

---

## Security Considerations

1. **Double Voting Prevention:** Storage mapping `receipts[proposalId][voter].hasVoted` is checked before any vote tallying.
2. **Flash-Loan Resistance:** `startBlock` snapshot guarantees that tokens minted or borrowed after proposal creation cannot vote.
3. **Immutability:** Once `finalizeProposal()` executes, `p.finalized = true` prevents altering results.
4. **Reentrancy Protection:** `executeProposal()` utilizes OpenZeppelin's `nonReentrant` modifier.
5. **AI Safety Isolation:** Vox Assistant has zero access to user private keys and cannot sign transactions. All proposals and votes require explicit wallet confirmation.

---

## Roadmap

* [x] BotChain ecosystem research and network parameter verification.
* [x] ERC20Votes token contract with checkpoints and testnet faucet.
* [x] Core VoxDAO governance contract with full lifecycle and execution.
* [x] Complete Foundry unit and integration test suite.
* [x] Live deployment to BotChain Testnet (Chain ID 968).
* [x] Verified on-chain initial proposal and vote transaction.
* [x] Web client interface with wallet connection and network auto-switch.
* [x] Vox Assistant AI copilot (Builder, Summarizer, Explainer, Live Q&A).
* [ ] Multi-sig execution timelock for large treasury disbursements.
* [ ] Quadratic voting experiment for community grant rounds.
* [ ] Telegram/Discord BotChain governance notifier bot.
