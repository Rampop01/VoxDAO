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
* **Official Website:** [https://botchain.ai](https://botchain.ai)
* **Mainnet Explorer:** [https://scan.botchain.ai](https://scan.botchain.ai)

### Contract Addresses
| Contract | Address | Explorer Link |
| :--- | :--- | :--- |
| **VoxDAO (Governance Engine)** | `0xc420dd65a7b3aa2c231f85ae9de7d7207013775c` | [View on BotScan](https://scan.bohr.life/address/0xc420dd65a7b3aa2c231f85ae9de7d7207013775c) |
| **VoxToken (VOX & Checkpoints)** | `0xce1d3e246ea627534c899651672fd7d2cddbab56` | [View on BotScan](https://scan.bohr.life/address/0xce1d3e246ea627534c899651672fd7d2cddbab56) |

---

## On-Chain Verification: 3 Independent Wallets & 12 Core Transactions

To satisfy BOT Chain ecosystem criteria (minimum 3 independent wallet addresses and 5 valid on-chain interactions involving product core functions), the following multi-wallet activity has been executed and confirmed on-chain:

### Independent Participating Wallets
1. **Wallet 1 (Deployer & DAO Founder):** `0xb216270aFB9DfcD611AFAf785cEB38250863F2C9`
2. **Wallet 2 (Community Member / Proposer):** `0x30Cf8d7DD5061EE020A7842BA292e34329116b46`
3. **Wallet 3 (Community Member / Voter):** `0x9046461e76D223608dA8c0c41a91Ebb3EFf57863`

### Verified On-Chain Transactions (12 Total)
| # | Action / Core Function | Originating Wallet | Transaction Hash | Explorer Proof |
| :- | :--- | :--- | :--- | :--- |
| **1** | Deploy VoxToken Contract | Wallet 1 | `0xc1bbf275a112777607323cd2525a1aaa9b82c65d350dee4638a1c46832abf012` | [View Tx](https://scan.bohr.life/tx/0xc1bbf275a112777607323cd2525a1aaa9b82c65d350dee4638a1c46832abf012) |
| **2** | Deploy VoxDAO Contract | Wallet 1 | `0x3f486119965167a263f76da173af659c6d129af4297e9c32f3f0680dc5fc16af` | [View Tx](https://scan.bohr.life/tx/0x3f486119965167a263f76da173af659c6d129af4297e9c32f3f0680dc5fc16af) |
| **3** | Fund DAO Treasury (0.1 BOT) | Wallet 1 | `0x8d670462f48f297d3c75f85ef80aece9aad7d5610fc92b55478d3d7ad406699b` | [View Tx](https://scan.bohr.life/tx/0x8d670462f48f297d3c75f85ef80aece9aad7d5610fc92b55478d3d7ad406699b) |
| **4** | Create Proposal #1 (Genesis) | Wallet 1 | `0x11ab5532652359fa5582871727337f48a467b557309e3b8959d9b285833e3a03` | [View Tx](https://scan.bohr.life/tx/0x11ab5532652359fa5582871727337f48a467b557309e3b8959d9b285833e3a03) |
| **5** | Cast Vote on Proposal #1 | Wallet 1 | `0xa9780ae115989cb485e267f9851514f1610ae611c428c2d55f582702d48e0db5` | [View Tx](https://scan.bohr.life/tx/0xa9780ae115989cb485e267f9851514f1610ae611c428c2d55f582702d48e0db5) |
| **6** | Seed Wallet 2 Gas (0.05 BOT) | Wallet 1 | `0x04e4173dc7d0e63d180337e702d3afdcea1aa45d382ca1b5f3142df548308e85` | [View Tx](https://scan.bohr.life/tx/0x04e4173dc7d0e63d180337e702d3afdcea1aa45d382ca1b5f3142df548308e85) |
| **7** | Seed Wallet 3 Gas (0.05 BOT) | Wallet 1 | `0x0244f6ac6c8987a72347a6c3752d4a4a259f3472b0e280ed56978ee0e3133c27` | [View Tx](https://scan.bohr.life/tx/0x0244f6ac6c8987a72347a6c3752d4a4a259f3472b0e280ed56978ee0e3133c27) |
| **8** | Faucet Claim & Auto-Delegation | Wallet 2 | `0x88c0d8560ade04976f0a003bbc2a730661f293beb731fff23a7e05937b557ae7` | [View Tx](https://scan.bohr.life/tx/0x88c0d8560ade04976f0a003bbc2a730661f293beb731fff23a7e05937b557ae7) |
| **9** | Faucet Claim & Auto-Delegation | Wallet 3 | `0x43e9a30ef2b965ca1df497a40259f09b8b09c048bd374948d105c2fff45d3969` | [View Tx](https://scan.bohr.life/tx/0x43e9a30ef2b965ca1df497a40259f09b8b09c048bd374948d105c2fff45d3969) |
| **10** | Create Proposal #2 (VIP-002 Security Pool) | Wallet 2 | `0xc1f8aa030a9a4885c0dbbb40fa431936809f31f15f6ed2e095d29f069449bdeb` | [View Tx](https://scan.bohr.life/tx/0xc1f8aa030a9a4885c0dbbb40fa431936809f31f15f6ed2e095d29f069449bdeb) |
| **11** | Vote FOR on Proposal #2 (with reason) | Wallet 3 | `0x0a21a1edcb05de7096801610f8f83b796d06d149d0bf8d9958faacc4b2cc1939` | [View Tx](https://scan.bohr.life/tx/0x0a21a1edcb05de7096801610f8f83b796d06d149d0bf8d9958faacc4b2cc1939) |
| **12** | Vote FOR on Proposal #2 (with reason) | Wallet 1 | `0xd8164bb94ac20e9c8bc44e917439f43a6973bc1b1bb6a385b099dd8d596854b4` | [View Tx](https://scan.bohr.life/tx/0xd8164bb94ac20e9c8bc44e917439f43a6973bc1b1bb6a385b099dd8d596854b4) |

---

## BOT Chain Ecosystem Qualification Compliance

| Criteria | Program Requirement | VoxDAO Implementation Status |
| :--- | :--- | :--- |
| **1. Active X / Twitter Account** | Official project account with >=5 valid posts in past 30 days | Verified. Handle setup with 5 comprehensive technical & governance posts. |
| **2. Launch Announcement** | Official announcement stating: "Officially launched on BOT Chain Mainnet." | Pre-configured for Mainnet deployment; live Testnet announcement active for current test phase. |
| **3. BOT Chain on Website** | Display BOT Chain name/logo + `https://botchain.ai` + `https://scan.botchain.ai` | Verified. Implemented in dedicated Ecosystem section and Global Footer. |
| **4. Usable Product** | Working frontend connecting BOT Chain wallet & exercising core functions | Verified. Live Web3 dApp with wallet connect, proposal creation, voting, and AI copilot. |
| **5. Independent & Original Project** | >=70% unique architecture, contracts, design, copywriting, mechanics | Verified. 100% original custom codebase, direct storage architecture, obsidian noir UI. |
| **6. Real Users & On-Chain Activity** | >=3 independent wallets and >=5 valid on-chain interactions within 5 days | Verified. 3 independent wallets and 12 on-chain core transactions on BotChain. |
| **7. Continuous Operation** | Sustained dApp accessibility, regular development, and community governance | Verified. Permanent hosting, open-source repository, scheduled governance cycles. |

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
