/**
 * VoxDAO Client Application & Vox Assistant Engine
 * BotChain Native On-Chain Governance Platform
 */

// --- Network & Contract Constants ---
const BOTCHAIN_TESTNET = {
  chainId: 968,
  chainIdHex: "0x3c8",
  chainName: "BOT Chain Testnet",
  rpcUrl: "https://rpc.bohr.life",
  explorerUrl: "https://scan.bohr.life",
  nativeCurrency: {
    name: "BOT",
    symbol: "BOT",
    decimals: 18,
  },
};

const BOTCHAIN_MAINNET = {
  chainId: 677,
  chainIdHex: "0x2a5",
  chainName: "BOT Chain Mainnet",
  rpcUrl: "https://rpc.botchain.ai",
  explorerUrl: "https://scan.botchain.ai",
  nativeCurrency: {
    name: "BOT",
    symbol: "BOT",
    decimals: 18,
  },
};

// Deployed Verified Addresses on BotChain Testnet
const CONTRACT_ADDRESSES = {
  dao: "0xc420dd65a7b3aa2c231f85ae9de7d7207013775c",
  token: "0xce1d3e246ea627534c899651672fd7d2cddbab56",
};

// --- Contract ABIs ---
const VOX_DAO_ABI = [
  "function daoName() view returns (string)",
  "function daoDescription() view returns (string)",
  "function proposalCount() view returns (uint256)",
  "function proposalThreshold() view returns (uint256)",
  "function defaultQuorum() view returns (uint256)",
  "function state(uint256 proposalId) view returns (uint8)",
  "function getProposal(uint256 proposalId) view returns (tuple(uint256 id, address proposer, string title, string description, string category, uint256 startBlock, uint256 startTime, uint256 endTime, uint256 quorum, uint256 minVotingPower, address target, uint256 value, bytes callData, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes, uint256 totalVoters, bool finalized, bool passed, bool executed, bool canceled))",
  "function getProposalVotes(uint256 proposalId) view returns (uint256 forVotes, uint256 againstVotes, uint256 abstainVotes, uint256 totalVoters)",
  "function getReceipt(uint256 proposalId, address voter) view returns (tuple(bool hasVoted, uint8 support, uint256 weight, uint256 timestamp, string reason))",
  "function hasVoted(uint256 proposalId, address voter) view returns (bool)",
  "function getVotingPower(address account, uint256 proposalId) view returns (uint256)",
  "function getProposals(uint256 offset, uint256 limit) view returns (tuple(uint256 id, address proposer, string title, string description, string category, uint256 startBlock, uint256 startTime, uint256 endTime, uint256 quorum, uint256 minVotingPower, address target, uint256 value, bytes callData, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes, uint256 totalVoters, bool finalized, bool passed, bool executed, bool canceled)[] list, uint256 total)",
  "function getDAOOverview() view returns (uint256 totalProposals, uint256 activeProposals, uint256 totalVotingSupply, uint256 currentQuorum, uint256 minThreshold, address tokenAddress, uint256 treasuryBalance)",
  "function createProposal(string title, string description, string category, uint256 duration, uint256 customQuorum, address target, uint256 value, bytes callData) returns (uint256)",
  "function castVote(uint256 proposalId, uint8 support) returns (uint256)",
  "function castVoteWithReason(uint256 proposalId, uint8 support, string reason) returns (uint256)",
  "function finalizeProposal(uint256 proposalId)",
  "function executeProposal(uint256 proposalId)",
  "function cancelProposal(uint256 proposalId)",
];

const VOX_TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function getVotes(address account) view returns (uint256)",
  "function delegates(address account) view returns (address)",
  "function delegate(address delegatee)",
  "function claimFaucet(address recipient)",
];

// --- App State ---
const state = {
  provider: null,
  signer: null,
  userAddress: null,
  userChainId: null,
  userNativeBalance: "0",
  userVoxBalance: "0",
  userVotingPower: "0",
  userDelegatee: null,
  daoContract: null,
  tokenContract: null,
  proposals: [],
  activeFilter: "all",
  currentModalProposalId: null,
  selectedVoteOption: null,
};

// --- Initialization ---
document.addEventListener("DOMContentLoaded", async () => {
  try {
    initProviders();
  } catch (e) {
    console.warn("Provider initialization deferred:", e);
  }

  try {
    setupEventListeners();
  } catch (e) {
    console.error("Setup event listeners error:", e);
  }

  try {
    await loadDAOData();
  } catch (e) {
    console.error("Load DAO data error:", e);
  }

  // If wallet already connected
  try {
    if (window.ethereum && window.ethereum.selectedAddress) {
      await connectWallet();
    }
  } catch (e) {
    console.warn("Auto-connect skipped:", e);
  }
});

function initProviders() {
  try {
    // Default read-only provider directly pointing to BotChain Testnet
    const fallbackProvider = new ethers.JsonRpcProvider(BOTCHAIN_TESTNET.rpcUrl);
    state.provider = fallbackProvider;
    state.daoContract = new ethers.Contract(CONTRACT_ADDRESSES.dao, VOX_DAO_ABI, fallbackProvider);
    state.tokenContract = new ethers.Contract(CONTRACT_ADDRESSES.token, VOX_TOKEN_ABI, fallbackProvider);
  } catch (err) {
    console.error("Failed to initialize read-only provider:", err);
  }
}

// --- Wallet Connection & Network Management ---
async function connectWallet() {
  if (!window.ethereum) {
    showToast("error", "No EVM Wallet Found", "Please install MetaMask or BO Wallet to interact with VoxDAO.");
    return;
  }

  try {
    showToast("loading", "Connecting Wallet", "Requesting account access...");
    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await browserProvider.send("eth_requestAccounts", []);
    const network = await browserProvider.getNetwork();
    const chainId = Number(network.chainId);

    state.provider = browserProvider;
    state.signer = await browserProvider.getSigner();
    state.userAddress = accounts[0];
    state.userChainId = chainId;

    // Attach signer to contracts
    state.daoContract = new ethers.Contract(CONTRACT_ADDRESSES.dao, VOX_DAO_ABI, state.signer);
    state.tokenContract = new ethers.Contract(CONTRACT_ADDRESSES.token, VOX_TOKEN_ABI, state.signer);

    updateWalletUI();

    // Check if on BotChain Testnet (Chain ID 968)
    if (chainId !== BOTCHAIN_TESTNET.chainId) {
      showToast("error", "Wrong Network", "Please switch your wallet to BotChain Testnet (Chain ID 968).");
      await switchOrAddBotChainNetwork();
    } else {
      showToast("success", "Wallet Connected", `Connected as ${truncateAddress(state.userAddress)}`);
    }

    await refreshUserData();
  } catch (err) {
    console.error("Wallet connection failed:", err);
    showToast("error", "Connection Failed", err.message || "User denied connection.");
  }
}

async function switchOrAddBotChainNetwork() {
  if (!window.ethereum) return;
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BOTCHAIN_TESTNET.chainIdHex }],
    });
  } catch (switchError) {
    // 4902 indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902 || switchError.code === -32603) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: BOTCHAIN_TESTNET.chainIdHex,
              chainName: BOTCHAIN_TESTNET.chainName,
              rpcUrls: [BOTCHAIN_TESTNET.rpcUrl],
              nativeCurrency: BOTCHAIN_TESTNET.nativeCurrency,
              blockExplorerUrls: [BOTCHAIN_TESTNET.explorerUrl],
            },
          ],
        });
      } catch (addError) {
        showToast("error", "Network Add Failed", addError.message);
      }
    }
  }
}

function updateWalletUI() {
  const btn = document.getElementById("connectWalletBtn");
  const netDot = document.getElementById("statusDot");
  const netName = document.getElementById("networkNameDisplay");

  if (state.userAddress) {
    btn.innerHTML = `<span>${truncateAddress(state.userAddress)}</span>`;
    btn.classList.remove("btn-primary");
    btn.classList.add("btn-secondary");

    if (state.userChainId === BOTCHAIN_TESTNET.chainId) {
      netDot.className = "status-dot";
      netName.innerText = "BotChain (968)";
    } else {
      netDot.className = "status-dot warning";
      netName.innerText = `Chain ${state.userChainId} (Switch)`;
    }
  } else {
    btn.innerHTML = `<span>Connect Wallet</span>`;
    btn.classList.add("btn-primary");
    btn.classList.remove("btn-secondary");
    netDot.className = "status-dot";
    netName.innerText = "BotChain (968)";
  }
}

async function refreshUserData() {
  if (!state.userAddress || !state.tokenContract) return;

  try {
    const [nativeBal, voxBal, votes, delegatee] = await Promise.all([
      state.provider.getBalance(state.userAddress),
      state.tokenContract.balanceOf(state.userAddress),
      state.tokenContract.getVotes(state.userAddress),
      state.tokenContract.delegates(state.userAddress),
    ]);

    state.userNativeBalance = ethers.formatEther(nativeBal);
    state.userVoxBalance = ethers.formatEther(voxBal);
    state.userVotingPower = ethers.formatEther(votes);
    state.userDelegatee = delegatee;

    // Update Metric
    document.getElementById("metricUserPower").innerText = `${formatNumber(state.userVotingPower)} VOX`;
    
    const isSelfDelegated = delegatee.toLowerCase() === state.userAddress.toLowerCase();
    const delegateText = isSelfDelegated
      ? "Delegated to Self"
      : delegatee === ethers.ZeroAddress
      ? "Not Delegated (0 Power)"
      : `Delegated to ${truncateAddress(delegatee)}`;
    
    document.getElementById("metricUserDelegate").innerText = delegateText;
    document.getElementById("delegateAddressInput").placeholder = state.userAddress;
  } catch (err) {
    console.error("Error refreshing user balances:", err);
  }
}

// --- Load DAO Data Directly from BotChain Smart Contracts ---
async function loadDAOData() {
  try {
    const dao = state.daoContract;
    if (!dao) return;

    // Direct View: getDAOOverview()
    const overview = await dao.getDAOOverview();
    const totalProps = Number(overview[0]);
    const activeProps = Number(overview[1]);
    const quorumFloor = ethers.formatEther(overview[3]);
    const treasuryBal = ethers.formatEther(overview[6]);

    document.getElementById("metricTotalProposals").innerText = totalProps.toString();
    document.getElementById("metricActiveProposals").innerText = activeProps.toString();
    document.getElementById("metricQuorum").innerText = `${formatNumber(quorumFloor)} VOX`;
    document.getElementById("metricTreasuryBalance").innerText = `${Number(treasuryBal).toFixed(2)} BOT`;

    // Populate Landing Page Stats
    const landingProps = document.getElementById("landingMetricProposals");
    const landingTreasury = document.getElementById("landingMetricTreasury");
    const landingQuorum = document.getElementById("landingMetricQuorum");
    if (landingProps) landingProps.innerText = totalProps.toString();
    if (landingTreasury) landingTreasury.innerText = `${Number(treasuryBal).toFixed(2)} BOT`;
    if (landingQuorum) landingQuorum.innerText = `${formatNumber(quorumFloor)} VOX`;

    // Direct View: getProposals(0, 50)
    const [propList, count] = await dao.getProposals(0, 50);
    state.proposals = propList.map((p) => formatProposalStruct(p));

    document.getElementById("proposalsCountLabel").innerText = `(${state.proposals.length} total)`;
    renderProposals();
  } catch (err) {
    console.error("Failed to load DAO data from BotChain:", err);
    document.getElementById("proposalsList").innerHTML = `
      <div style="text-align: center; padding: 40px; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
        <p style="color: var(--indicator-fail); font-weight: 600;">Failed to query BotChain smart contract directly.</p>
        <p style="font-size: 13px; color: var(--text-muted); margin-top: 8px;">Verify RPC connectivity to ${BOTCHAIN_TESTNET.rpcUrl}</p>
        <button class="btn-secondary" onclick="loadDAOData()" style="margin-top: 14px;">Try Again</button>
      </div>
    `;
  }
}

function formatProposalStruct(p) {
  return {
    id: Number(p.id),
    proposer: p.proposer,
    title: p.title,
    description: p.description,
    category: p.category || "General",
    startBlock: Number(p.startBlock),
    startTime: Number(p.startTime),
    endTime: Number(p.endTime),
    quorum: ethers.formatEther(p.quorum),
    minVotingPower: ethers.formatEther(p.minVotingPower),
    target: p.target,
    value: ethers.formatEther(p.value),
    callData: p.callData,
    forVotes: ethers.formatEther(p.forVotes),
    againstVotes: ethers.formatEther(p.againstVotes),
    abstainVotes: ethers.formatEther(p.abstainVotes),
    totalVoters: Number(p.totalVoters),
    finalized: p.finalized,
    passed: p.passed,
    executed: p.executed,
    canceled: p.canceled,
  };
}

// --- Render Proposals List with Filter ---
function renderProposals() {
  const container = document.getElementById("proposalsList");
  if (!container) return;

  const now = Math.floor(Date.now() / 1000);
  const filtered = state.proposals.filter((p) => {
    const isPending = now < p.startTime;
    const isActive = now >= p.startTime && now <= p.endTime && !p.finalized && !p.canceled;
    const isEnded = now > p.endTime && !p.finalized && !p.canceled;

    if (state.activeFilter === "all") return true;
    if (state.activeFilter === "active") return isActive;
    if (state.activeFilter === "passed") return p.passed;
    if (state.activeFilter === "defeated") return p.finalized && !p.passed;
    if (state.activeFilter === "finalized") return p.finalized;
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 48px; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle); color: var(--text-muted);">
        <p>No proposals match the selected filter "${state.activeFilter}".</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered
    .map((p) => {
      const forV = Number(p.forVotes);
      const againstV = Number(p.againstVotes);
      const abstainV = Number(p.abstainVotes);
      const totalV = forV + againstV + abstainV;

      const pctFor = totalV > 0 ? ((forV / totalV) * 100).toFixed(1) : 0;
      const pctAgainst = totalV > 0 ? ((againstV / totalV) * 100).toFixed(1) : 0;
      const pctAbstain = totalV > 0 ? ((abstainV / totalV) * 100).toFixed(1) : 0;

      const quorumVal = Number(p.quorum);
      const quorumMet = totalV >= quorumVal;

      // Status pill
      let statusClass = "pending";
      let statusLabel = "Pending";
      if (p.canceled) {
        statusClass = "defeated";
        statusLabel = "Canceled";
      } else if (p.executed) {
        statusClass = "executed";
        statusLabel = "Executed";
      } else if (p.finalized) {
        statusClass = p.passed ? "succeeded" : "defeated";
        statusLabel = p.passed ? "Passed" : "Defeated";
      } else if (now < p.startTime) {
        statusClass = "pending";
        statusLabel = "Pending";
      } else if (now <= p.endTime) {
        statusClass = "active";
        statusLabel = "Active";
      } else {
        statusClass = "pending";
        statusLabel = "Ended (Needs Finalization)";
      }

      const timeLeftText = formatTimeRemaining(p.endTime, now, p.finalized);

      return `
        <div class="proposal-card" onclick="openProposalModal(${p.id})">
          <div class="card-top">
            <div class="card-meta">
              <span class="category-tag">${escapeHTML(p.category)}</span>
              <span>#${p.id}</span>
              <span>• Proposer: ${truncateAddress(p.proposer)}</span>
            </div>
            <span class="status-badge ${statusClass}">${statusLabel}</span>
          </div>

          <h3 class="proposal-title">${escapeHTML(p.title)}</h3>
          <p class="proposal-snippet">${escapeHTML(p.description)}</p>

          <!-- Vote Progress Bar -->
          <div class="vote-progress-wrapper">
            <div class="vote-bar-container">
              <div class="vote-bar-segment segment-for" style="width: ${pctFor}%;"></div>
              <div class="vote-bar-segment segment-against" style="width: ${pctAgainst}%;"></div>
              <div class="vote-bar-segment segment-abstain" style="width: ${pctAbstain}%;"></div>
            </div>
            <div class="vote-stats-row">
              <span class="vote-stat dot-for">For: ${formatNumber(forV)} VOX (${pctFor}%)</span>
              <span class="vote-stat dot-against">Against: ${formatNumber(againstV)} VOX (${pctAgainst}%)</span>
              <span class="vote-stat dot-abstain">Abstain: ${formatNumber(abstainV)} VOX (${pctAbstain}%)</span>
            </div>
          </div>

          <div class="card-footer">
            <span>Quorum: <strong>${formatNumber(totalV)} / ${formatNumber(quorumVal)} VOX</strong> ${quorumMet ? "[Reached]" : "[Pending]"}</span>
            <span>${timeLeftText}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

// --- Proposal Detail Modal Logic ---
async function openProposalModal(proposalId) {
  state.currentModalProposalId = proposalId;
  state.selectedVoteOption = null;

  const modal = document.getElementById("proposalModal");
  modal.classList.add("open");

  const prop = state.proposals.find((p) => p.id === proposalId);
  if (!prop) return;

  // Set Static Info
  document.getElementById("modalProposalId").innerText = `#${prop.id}`;
  document.getElementById("modalCategory").innerText = prop.category;
  document.getElementById("modalTitle").innerText = prop.title;
  document.getElementById("modalDescription").innerText = prop.description;
  document.getElementById("modalSnapshotBlock").innerText = prop.startBlock;
  document.getElementById("modalQuorumReq").innerText = `${formatNumber(prop.quorum)} VOX`;
  document.getElementById("modalTotalVoters").innerText = prop.totalVoters.toString();

  const proposerLink = document.getElementById("modalProposerLink");
  proposerLink.innerText = truncateAddress(prop.proposer);
  proposerLink.href = `${BOTCHAIN_TESTNET.explorerUrl}/address/${prop.proposer}`;

  // Time & Status
  const now = Math.floor(Date.now() / 1000);
  const statusBadge = document.getElementById("modalStatusBadge");
  const isEnded = now > prop.endTime;
  const isActive = now >= prop.startTime && now <= prop.endTime && !prop.finalized && !prop.canceled;

  if (prop.canceled) {
    statusBadge.className = "status-badge defeated";
    statusBadge.innerText = "Canceled";
  } else if (prop.executed) {
    statusBadge.className = "status-badge executed";
    statusBadge.innerText = "Executed";
  } else if (prop.finalized) {
    statusBadge.className = prop.passed ? "status-badge succeeded" : "status-badge defeated";
    statusBadge.innerText = prop.passed ? "Passed" : "Defeated";
  } else if (isActive) {
    statusBadge.className = "status-badge active";
    statusBadge.innerText = "Active";
  } else if (isEnded) {
    statusBadge.className = "status-badge pending";
    statusBadge.innerText = "Voting Ended";
  } else {
    statusBadge.className = "status-badge pending";
    statusBadge.innerText = "Pending Start";
  }

  document.getElementById("modalEndTime").innerText = new Date(prop.endTime * 1000).toLocaleString();

  // Execution Section
  const actionSec = document.getElementById("modalActionSection");
  if (prop.target && prop.target !== ethers.ZeroAddress) {
    actionSec.style.display = "block";
    document.getElementById("modalActionTarget").innerText = prop.target;
    document.getElementById("modalActionValue").innerText = `${prop.value} BOT`;
    document.getElementById("modalActionStatus").innerText = prop.executed
      ? "Status: Executed on BotChain"
      : prop.passed
      ? "Status: Passed and ready to execute"
      : "Status: Execution contingent upon passing";
  } else {
    actionSec.style.display = "none";
  }

  // Vote Bars & Percentages
  updateModalVoteBars(prop);

  // User Snapshot Voting Power & Eligibility
  await updateModalUserEligibility(prop);

  // Lifecycle Action Buttons
  const finalizeBtn = document.getElementById("modalFinalizeBtn");
  const executeBtn = document.getElementById("modalExecuteBtn");

  finalizeBtn.style.display = isEnded && !prop.finalized && !prop.canceled ? "inline-flex" : "none";
  executeBtn.style.display = prop.finalized && prop.passed && !prop.executed && prop.target !== ethers.ZeroAddress ? "inline-flex" : "none";

  // Reset Vote Options selection
  resetVoteButtons();
}

function updateModalVoteBars(prop) {
  const forV = Number(prop.forVotes);
  const againstV = Number(prop.againstVotes);
  const abstainV = Number(prop.abstainVotes);
  const totalV = forV + againstV + abstainV;

  const pctFor = totalV > 0 ? ((forV / totalV) * 100).toFixed(1) : 0;
  const pctAgainst = totalV > 0 ? ((againstV / totalV) * 100).toFixed(1) : 0;
  const pctAbstain = totalV > 0 ? ((abstainV / totalV) * 100).toFixed(1) : 0;

  document.getElementById("modalBarFor").style.width = `${pctFor}%`;
  document.getElementById("modalBarAgainst").style.width = `${pctAgainst}%`;
  document.getElementById("modalBarAbstain").style.width = `${pctAbstain}%`;

  document.getElementById("modalVotesFor").innerText = `${formatNumber(forV)} VOX`;
  document.getElementById("modalVotesAgainst").innerText = `${formatNumber(againstV)} VOX`;
  document.getElementById("modalVotesAbstain").innerText = `${formatNumber(abstainV)} VOX`;

  document.getElementById("modalPctFor").innerText = `${pctFor}%`;
  document.getElementById("modalPctAgainst").innerText = `${pctAgainst}%`;
  document.getElementById("modalPctAbstain").innerText = `${pctAbstain}%`;

  const quorumVal = Number(prop.quorum);
  const quorumMet = totalV >= quorumVal;
  const qStatus = document.getElementById("modalQuorumStatus");
  qStatus.innerText = quorumMet ? "Quorum Reached" : "Quorum Not Reached";
  qStatus.style.color = quorumMet ? "var(--chrome-pure)" : "var(--chrome-dim)";
}

async function updateModalUserEligibility(prop) {
  const notice = document.getElementById("modalUserEligibleNotice");
  const powerEl = document.getElementById("modalUserSnapshotPower");
  const receiptCard = document.getElementById("modalUserReceiptCard");
  const receiptText = document.getElementById("modalUserReceiptText");
  const voteBtn = document.getElementById("confirmVoteBtn");
  const voteBox = document.getElementById("modalVotingBox");

  const now = Math.floor(Date.now() / 1000);
  const isActive = now >= prop.startTime && now <= prop.endTime && !prop.finalized && !prop.canceled;

  if (!state.userAddress) {
    powerEl.innerText = "Connect Wallet";
    voteBtn.disabled = true;
    voteBtn.innerText = "Connect Wallet to Vote";
    receiptCard.style.display = "none";
    return;
  }

  try {
    const dao = state.daoContract;
    // Direct Contract Read: getVotingPower(address, proposalId)
    const [powerWei, receipt] = await Promise.all([
      dao.getVotingPower(state.userAddress, prop.id),
      dao.getReceipt(prop.id, state.userAddress),
    ]);

    const power = ethers.formatEther(powerWei);
    powerEl.innerText = `${formatNumber(power)} VOX`;

    if (receipt.hasVoted) {
      receiptCard.style.display = "block";
      const supportName = receipt.support === 1 ? "FOR" : receipt.support === 0 ? "AGAINST" : "ABSTAIN";
      receiptText.innerHTML = `You voted <strong>${supportName}</strong> with <strong>${formatNumber(ethers.formatEther(receipt.weight))} VOX</strong> voting power.${receipt.reason ? `<br><em>"${escapeHTML(receipt.reason)}"</em>` : ""}`;
      
      voteBtn.disabled = true;
      voteBtn.innerText = "Vote Already Recorded on BotChain";
    } else {
      receiptCard.style.display = "none";
      if (!isActive) {
        voteBtn.disabled = true;
        voteBtn.innerText = "Voting is Not Currently Active";
      } else if (Number(power) < Number(prop.minVotingPower)) {
        voteBtn.disabled = true;
        voteBtn.innerText = `Requires min ${formatNumber(prop.minVotingPower)} VOX at Snapshot Block #${prop.startBlock}`;
      } else {
        voteBtn.innerText = "Select an Option to Vote";
      }
    }
  } catch (err) {
    console.error("Error reading voter eligibility:", err);
  }
}

function resetVoteButtons() {
  document.getElementById("btnVoteFor").className = "vote-opt-btn";
  document.getElementById("btnVoteAgainst").className = "vote-opt-btn";
  document.getElementById("btnVoteAbstain").className = "vote-opt-btn";
  state.selectedVoteOption = null;
}

// --- Cast Vote Transaction ---
async function castVote() {
  if (state.selectedVoteOption === null) {
    showToast("error", "No Option Selected", "Please select For, Against, or Abstain before submitting.");
    return;
  }
  if (!state.signer) {
    await connectWallet();
    return;
  }

  const propId = state.currentModalProposalId;
  const reason = document.getElementById("voteReasonInput").value.trim();

  try {
    const btn = document.getElementById("confirmVoteBtn");
    btn.disabled = true;
    btn.innerText = "Confirm in Wallet...";
    showToast("loading", "Confirm in Wallet", "Please confirm the vote transaction in your wallet...");

    const dao = new ethers.Contract(CONTRACT_ADDRESSES.dao, VOX_DAO_ABI, state.signer);
    let tx;
    if (reason.length > 0) {
      tx = await dao.castVoteWithReason(propId, state.selectedVoteOption, reason);
    } else {
      tx = await dao.castVote(propId, state.selectedVoteOption);
    }

    btn.innerText = "Submitting to BotChain...";
    showToast("loading", "Submitting Transaction", `Transaction broadcasted: ${truncateAddress(tx.hash)}. Awaiting BotChain block...`);

    const receipt = await tx.wait(1);
    showToast("success", "Vote Confirmed On-Chain!", `Vote recorded in block #${receipt.blockNumber}.`);

    // Reload state
    await loadDAOData();
    await openProposalModal(propId);
  } catch (err) {
    console.error("Vote failed:", err);
    showToast("error", "Vote Failed", decodeContractError(err));
    const btn = document.getElementById("confirmVoteBtn");
    btn.disabled = false;
    btn.innerText = "Retry Vote";
  }
}

// --- Finalize & Execute Actions ---
async function finalizeProposal() {
  if (!state.signer) return connectWallet();
  const propId = state.currentModalProposalId;

  try {
    showToast("loading", "Finalizing Proposal", "Confirm transaction to finalize proposal outcome...");
    const dao = new ethers.Contract(CONTRACT_ADDRESSES.dao, VOX_DAO_ABI, state.signer);
    const tx = await dao.finalizeProposal(propId);
    showToast("loading", "Finalizing on BotChain", `Tx Hash: ${truncateAddress(tx.hash)}...`);
    await tx.wait(1);
    showToast("success", "Proposal Finalized", "The outcome is now permanently locked on BotChain.");
    await loadDAOData();
    await openProposalModal(propId);
  } catch (err) {
    showToast("error", "Finalization Failed", decodeContractError(err));
  }
}

async function executeProposal() {
  if (!state.signer) return connectWallet();
  const propId = state.currentModalProposalId;

  try {
    showToast("loading", "Executing Action", "Confirm transaction to execute proposal...");
    const dao = new ethers.Contract(CONTRACT_ADDRESSES.dao, VOX_DAO_ABI, state.signer);
    const tx = await dao.executeProposal(propId);
    showToast("loading", "Executing on BotChain", `Tx Hash: ${truncateAddress(tx.hash)}...`);
    await tx.wait(1);
    showToast("success", "Action Executed", "The treasury action has been executed on-chain.");
    await loadDAOData();
    await openProposalModal(propId);
  } catch (err) {
    showToast("error", "Execution Failed", decodeContractError(err));
  }
}

// --- Create Proposal Flow ---
async function handleCreateProposal(e) {
  e.preventDefault();
  if (!state.signer) {
    await connectWallet();
    return;
  }

  const title = document.getElementById("propTitle").value.trim();
  const desc = document.getElementById("propDescription").value.trim();
  const category = document.getElementById("propCategory").value;
  const hours = Number(document.getElementById("propDurationHours").value);
  const quorum = Number(document.getElementById("propQuorum").value);
  const target = document.getElementById("propTarget").value.trim() || ethers.ZeroAddress;
  const valueBot = document.getElementById("propValue").value.trim() || "0";

  if (!title || !desc) {
    showToast("error", "Missing Information", "Please provide a proposal title and description.");
    return;
  }

  const durationSeconds = hours * 3600;
  const quorumWei = ethers.parseEther(quorum.toString());
  const valueWei = ethers.parseEther(valueBot.toString());
  const callData = "0x";

  try {
    const btn = document.getElementById("submitProposalBtn");
    btn.disabled = true;
    btn.innerText = "Confirm in Wallet...";
    showToast("loading", "Submitting Proposal", "Confirm creation transaction in your wallet...");

    const dao = new ethers.Contract(CONTRACT_ADDRESSES.dao, VOX_DAO_ABI, state.signer);
    const tx = await dao.createProposal(
      title,
      desc,
      category,
      durationSeconds,
      quorumWei,
      target,
      valueWei,
      callData
    );

    btn.innerText = "Broadcasting to BotChain...";
    showToast("loading", "Broadcasted", `Tx: ${truncateAddress(tx.hash)}. Awaiting block confirmation...`);

    const receipt = await tx.wait(1);
    showToast("success", "Proposal Created On-Chain!", `Proposal confirmed in block #${receipt.blockNumber}`);

    btn.disabled = false;
    btn.innerText = "Sign & Submit Proposal to BotChain";

    // Clear form and switch to proposals tab
    document.getElementById("createProposalForm").reset();
    await loadDAOData();
    switchTab("proposalsTab");
  } catch (err) {
    console.error("Proposal creation failed:", err);
    showToast("error", "Creation Failed", decodeContractError(err));
    const btn = document.getElementById("submitProposalBtn");
    btn.disabled = false;
    btn.innerText = "Sign & Submit Proposal to BotChain";
  }
}

// --- Faucet & Delegation Actions ---
async function claimFaucet() {
  if (!state.signer) return connectWallet();

  try {
    showToast("loading", "Claiming Faucet", "Confirm transaction to claim 1,000 VOX...");
    const token = new ethers.Contract(CONTRACT_ADDRESSES.token, VOX_TOKEN_ABI, state.signer);
    const tx = await token.claimFaucet(state.userAddress);
    showToast("loading", "Minting on BotChain", `Tx: ${truncateAddress(tx.hash)}...`);
    await tx.wait(1);
    showToast("success", "Tokens Claimed!", "1,000 VOX minted and auto-delegated to your address.");
    await refreshUserData();
  } catch (err) {
    showToast("error", "Faucet Claim Failed", decodeContractError(err));
  }
}

async function delegateTokens(toAddress) {
  if (!state.signer) return connectWallet();
  const target = toAddress || document.getElementById("delegateAddressInput").value.trim();

  if (!target || !ethers.isAddress(target)) {
    showToast("error", "Invalid Address", "Please enter a valid Ethereum/BotChain address.");
    return;
  }

  try {
    showToast("loading", "Delegating Power", `Confirm delegation transaction to ${truncateAddress(target)}...`);
    const token = new ethers.Contract(CONTRACT_ADDRESSES.token, VOX_TOKEN_ABI, state.signer);
    const tx = await token.delegate(target);
    await tx.wait(1);
    showToast("success", "Delegation Confirmed", `Voting power assigned to ${truncateAddress(target)}.`);
    await refreshUserData();
  } catch (err) {
    showToast("error", "Delegation Failed", decodeContractError(err));
  }
}

// --- Vox Assistant (AI Governance Copilot) ---
function setupAssistant() {
  const form = document.getElementById("assistantChatForm");
  const input = document.getElementById("assistantChatInput");
  const chatBox = document.getElementById("assistantChatBox");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;
    input.value = "";
    handleAssistantQuery(query);
  });

  // Quick Chips
  document.querySelectorAll(".quick-prompt-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const prompt = chip.getAttribute("data-prompt");
      handleAssistantQuery(prompt);
    });
  });

  // Proposal Builder inside Create Tab
  document.getElementById("aiDraftBtn").addEventListener("click", () => {
    const idea = document.getElementById("aiIdeaInput").value.trim();
    if (!idea) {
      showToast("error", "Input Required", "Please enter an idea description.");
      return;
    }
    buildProposalDraft(idea);
  });

  // Modal Explainer Button
  document.getElementById("modalSummarizeAiBtn").addEventListener("click", () => {
    explainActiveModalProposal();
  });
}

function appendChatMessage(sender, text, isAi = false, badgeText = null) {
  const chatBox = document.getElementById("assistantChatBox");
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${sender}`;

  let html = "";
  if (isAi) {
    html += `<div class="ai-badge">${badgeText || "Vox Assistant"}</div>`;
  }
  html += `<div>${text}</div>`;

  bubble.innerHTML = html;
  chatBox.appendChild(bubble);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function handleAssistantQuery(query) {
  appendChatMessage("user", escapeHTML(query));

  const lower = query.toLowerCase();

  // 1. Eligibility Check
  if (lower.includes("eligible") || lower.includes("can i vote") || lower.includes("eligibility")) {
    if (!state.userAddress) {
      appendChatMessage(
        "assistant",
        "To check your voting eligibility against live BotChain state, please connect your wallet first. VoxDAO requires you to hold voting power snapshotted at each proposal's start block.",
        true
      );
      return;
    }

    const power = Number(state.userVotingPower);
    if (power >= 1) {
      appendChatMessage(
        "assistant",
        `<strong>Verified On-Chain State:</strong><br>
        Connected Wallet: <code>${state.userAddress}</code><br>
        Active Voting Power: <strong>${formatNumber(power)} VOX</strong><br>
        Eligibility Status: <span style="color: var(--chrome-pure); font-weight: 700;">ELIGIBLE</span> for active proposals.<br><br>
        <em>Note: Voting power for each proposal is locked at its specific start block snapshot.</em>`,
        true,
        "Verified State"
      );
    } else {
      appendChatMessage(
        "assistant",
        `<strong>Verified On-Chain State:</strong><br>
        Connected Wallet: <code>${state.userAddress}</code><br>
        Voting Power: <strong>0 VOX</strong><br>
        Status: <span style="color: var(--indicator-fail); font-weight: 700;">INELIGIBLE</span> (Minimum 1 VOX required).<br><br>
        <em>Action: Visit the <a href="#" onclick="showAppView('faucetTab')" style="color: var(--chrome-pure); text-decoration: underline;">Faucet Tab</a> to claim 1,000 VOX test tokens and auto-delegate power!</em>`,
        true,
        "Verified State"
      );
    }
    return;
  }

  // 2. Voting Power Query
  if (lower.includes("power") || lower.includes("how much") || lower.includes("balance")) {
    if (!state.userAddress) {
      appendChatMessage("assistant", "Please connect your wallet to inspect your on-chain voting power.", true);
      return;
    }
    appendChatMessage(
      "assistant",
      `<strong>Voting Power Analysis:</strong><br>
      • Current VOX Token Balance: <strong>${state.userVoxBalance} VOX</strong><br>
      • Active Voting Power (Delegated): <strong>${state.userVotingPower} VOX</strong><br>
      • Native Gas Balance: <strong>${state.userNativeBalance} BOT</strong><br><br>
      Remember: Voting in proposals uses your voting power at the proposal's snapshot block.`,
      true,
      "Live Checkpoint"
    );
    return;
  }

  // 3. Explain Proposal #1
  if (lower.includes("proposal #1") || lower.includes("proposal 1") || lower.includes("vip-001")) {
    const p1 = state.proposals.find((p) => p.id === 1);
    if (p1) {
      appendChatMessage(
        "assistant",
        `<strong>Objective Breakdown of Proposal #1:</strong><br><br>
        <strong>Title:</strong> ${escapeHTML(p1.title)}<br>
        <strong>Category:</strong> ${p1.category}<br>
        <strong>What is Proposed:</strong> Allocate 0.05 BOT from the DAO treasury to support open-source developer tooling and autonomous agents on BotChain.<br>
        <strong>Potential Benefits:</strong> Expands developer ecosystem, creates verifiable tooling, increases network activity.<br>
        <strong>Potential Risks:</strong> Requires trusted execution to developer addresses; 0.05 BOT leaves the treasury.<br>
        <strong>Current Result:</strong> ${formatNumber(p1.forVotes)} VOX For vs ${formatNumber(p1.againstVotes)} VOX Against.`,
        true,
        "Proposal Summary"
      );
      return;
    }
  }

  // 4. What happens if I vote Against?
  if (lower.includes("vote against") || lower.includes("vote no")) {
    appendChatMessage(
      "assistant",
      `<strong>Governance Mechanism Explanation:</strong><br>
      • When you vote <strong>AGAINST</strong>, your snapshot voting power is added to the proposal's <code>againstVotes</code> tally.<br>
      • Your vote <em>still counts</em> toward fulfilling the required quorum (${document.getElementById("metricQuorum").innerText}), ensuring sufficient community participation.<br>
      • If <code>againstVotes ≥ forVotes</code> at deadline, the proposal is marked <strong>Defeated</strong> and any treasury transfers will be blocked permanently.`,
      true,
      "Governance Rules"
    );
    return;
  }

  // 5. Snapshot Checkpoint Explanation
  if (lower.includes("snapshot") || lower.includes("flash") || lower.includes("checkpoint")) {
    appendChatMessage(
      "assistant",
      `<strong>Snapshot Security & Checkpoint Architecture:</strong><br>
      VoxDAO uses OpenZeppelin's <code>ERC20Votes</code> checkpoints. When a proposal is created at block <em>N</em>, the contract locks the snapshot timepoint at <code>block.number - 1</code>.<br><br>
      <strong>Why this matters:</strong><br>
      1. Prevents Flash-Loan Attacks: Borrowing millions in tokens during voting grants ZERO voting power on existing proposals.<br>
      2. Prevents Vote-Buying: Tokens bought after proposal creation cannot vote.<br>
      3. Immutability: Historical voting balances are cryptographically verified by past block states.`,
      true,
      "Security Architecture"
    );
    return;
  }

  // Fallback AI Assistance
  appendChatMessage(
    "assistant",
    `I understand you're asking: "${escapeHTML(query)}".<br><br>
    As the VoxDAO assistant, I can provide objective information on proposals, verify your wallet's on-chain eligibility, or explain governance mechanics. Feel free to click any of the quick suggestion chips above!`,
    true
  );
}

function buildProposalDraft(idea) {
  const lower = idea.toLowerCase();
  let category = "Treasury";
  let title = "VIP: Community Initiative Proposal";
  let duration = "72";
  let quorum = "500";
  let target = "";
  let value = "0";

  if (lower.includes("spend") || lower.includes("fund") || lower.includes("grant") || lower.includes("bot")) {
    category = "Treasury";
    title = "VIP: Ecosystem Developer & Tooling Grant";
    value = "0.05";
    target = state.userAddress || "0x0000000000000000000000000000000000000000";
  } else if (lower.includes("parameter") || lower.includes("delay") || lower.includes("threshold")) {
    category = "Protocol";
    title = "VIP: Governance Parameter Optimization";
  } else {
    category = "Community";
    title = "VIP: Community Growth & Education Program";
  }

  const generatedDesc = `## Proposal Summary\n${idea}\n\n## Motivation & Objectives\nThis proposal aims to strengthen the BotChain decentralized ecosystem by allocating resources transparently and recording execution on-chain.\n\n## Implementation Milestones\n1. Community review and on-chain voting period\n2. Execution via smart contract treasury\n3. Verifiable milestone reporting on BotScan\n\n## Considerations\n- Transparency ensured via on-chain receipts\n- Independent voter participation`;

  // Populate Form
  document.getElementById("propTitle").value = title;
  document.getElementById("propCategory").value = category;
  document.getElementById("propDescription").value = generatedDesc;
  document.getElementById("propDurationHours").value = duration;
  document.getElementById("propQuorum").value = quorum;
  document.getElementById("propTarget").value = target;
  document.getElementById("propValue").value = value;

  // Trigger preview update
  updateLivePreview();
  showToast("success", "Draft Generated", "Vox Assistant generated a structured proposal draft. Review and edit before submitting.");
}

function explainActiveModalProposal() {
  const prop = state.proposals.find((p) => p.id === state.currentModalProposalId);
  if (!prop) return;

  const explBox = document.getElementById("modalAiExplanation");
  explBox.innerHTML = `
    <strong>AI Summary:</strong><br>
    • <strong>Action:</strong> ${escapeHTML(prop.title)} (${prop.category})<br>
    • <strong>Target Effect:</strong> ${prop.value > 0 ? `Transfers ${prop.value} native BOT to ${truncateAddress(prop.target)} upon passing.` : "Updates community consensus with no immediate financial transfer."}<br>
    • <strong>Quorum Requirement:</strong> ${formatNumber(prop.quorum)} VOX total participation needed.<br>
    • <strong>Key Consideration:</strong> Ensure the recipient and milestones are verified before voting FOR.
  `;
}

// --- Live Proposal Preview ---
function updateLivePreview() {
  const title = document.getElementById("propTitle").value.trim() || "Proposal Title Preview";
  const desc = document.getElementById("propDescription").value.trim() || "Your detailed description and breakdown will render here for voters to read.";
  const cat = document.getElementById("propCategory").value;
  const hours = document.getElementById("propDurationHours").value || "72";
  const quorum = document.getElementById("propQuorum").value || "500";
  const target = document.getElementById("propTarget").value.trim();
  const value = document.getElementById("propValue").value.trim();

  document.getElementById("previewTitle").innerText = title;
  document.getElementById("previewDesc").innerText = desc;
  document.getElementById("previewCategory").innerText = cat;
  document.getElementById("previewQuorumText").innerText = `${formatNumber(quorum)} VOX`;
  document.getElementById("previewDurationText").innerText = `${hours} hours`;
  document.getElementById("previewProposer").innerText = state.userAddress ? truncateAddress(state.userAddress) : "Connected Wallet";

  if (target && value) {
    document.getElementById("previewActionText").innerText = `Action: ${value} BOT to ${truncateAddress(target)}`;
  } else {
    document.getElementById("previewActionText").innerText = "No action attached";
  }
}

// --- Event Listeners & UI Helpers ---
function setupEventListeners() {
  // Navigation Tabs inside App View
  document.querySelectorAll("#appNavTabs .nav-tab-btn[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.getAttribute("data-tab");
      switchTab(tabId);
    });
  });

  // View Switchers: Landing View <-> Governance App View
  document.getElementById("launchAppTopBtn")?.addEventListener("click", () => showAppView("proposalsTab"));
  document.getElementById("enterAppHeroBtn")?.addEventListener("click", () => showAppView("proposalsTab"));
  document.getElementById("landingEnterAppBtn")?.addEventListener("click", () => showAppView("proposalsTab"));
  document.getElementById("navReturnLandingBtn")?.addEventListener("click", () => showLandingView());
  document.getElementById("backToLandingBtn")?.addEventListener("click", () => showLandingView());
  document.getElementById("brandLogoBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    showLandingView();
  });

  // Wallet Connect
  document.getElementById("connectWalletBtn").addEventListener("click", connectWallet);
  document.getElementById("networkIndicator").addEventListener("click", switchOrAddBotChainNetwork);

  // Refresh Button
  document.getElementById("refreshStatsBtn").addEventListener("click", async () => {
    showToast("loading", "Refreshing", "Syncing with BotChain...");
    await loadDAOData();
    if (state.userAddress) await refreshUserData();
    showToast("success", "Updated", "On-chain state synchronized.");
  });

  // Proposal Filters
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.activeFilter = btn.getAttribute("data-filter");
      renderProposals();
    });
  });

  // Modal Close
  document.getElementById("closeModalBtn").addEventListener("click", () => {
    document.getElementById("proposalModal").classList.remove("open");
  });
  document.getElementById("proposalModal").addEventListener("click", (e) => {
    if (e.target.id === "proposalModal") {
      document.getElementById("proposalModal").classList.remove("open");
    }
  });

  // Vote Option Buttons
  document.getElementById("btnVoteFor").addEventListener("click", () => selectVoteOption(1));
  document.getElementById("btnVoteAgainst").addEventListener("click", () => selectVoteOption(0));
  document.getElementById("btnVoteAbstain").addEventListener("click", () => selectVoteOption(2));

  document.getElementById("confirmVoteBtn").addEventListener("click", castVote);
  document.getElementById("modalFinalizeBtn").addEventListener("click", finalizeProposal);
  document.getElementById("modalExecuteBtn").addEventListener("click", executeProposal);

  // Proposal Creation Form
  document.getElementById("createProposalForm").addEventListener("submit", handleCreateProposal);
  ["propTitle", "propDescription", "propCategory", "propDurationHours", "propQuorum", "propTarget", "propValue"].forEach((id) => {
    document.getElementById(id).addEventListener("input", updateLivePreview);
  });

  // Faucet & Delegation
  document.getElementById("claimFaucetBtn").addEventListener("click", claimFaucet);
  document.getElementById("delegateSelfBtn").addEventListener("click", () => {
    if (state.userAddress) {
      document.getElementById("delegateAddressInput").value = state.userAddress;
    } else {
      connectWallet();
    }
  });
  document.getElementById("executeDelegateBtn").addEventListener("click", () => delegateTokens());

  // Assistant setup
  setupAssistant();

  // Ethereum provider event listeners
  if (window.ethereum) {
    window.ethereum.on("accountsChanged", async (accounts) => {
      if (accounts.length > 0) {
        state.userAddress = accounts[0];
        updateWalletUI();
        await refreshUserData();
      } else {
        state.userAddress = null;
        updateWalletUI();
      }
    });

    window.ethereum.on("chainChanged", (chainIdHex) => {
      state.userChainId = parseInt(chainIdHex, 16);
      updateWalletUI();
      window.location.reload();
    });
  }
}

function showLandingView() {
  const landing = document.getElementById("landingView");
  const app = document.getElementById("appView");
  const landingNav = document.getElementById("landingNavLinks");
  const appNav = document.getElementById("appNavTabs");
  const launchBtn = document.getElementById("launchAppTopBtn");
  const connectBtn = document.getElementById("connectWalletBtn");

  if (landing) landing.style.display = "block";
  if (app) app.style.display = "none";
  if (landingNav) landingNav.style.display = "flex";
  if (appNav) appNav.style.display = "none";
  if (launchBtn) launchBtn.style.display = "inline-flex";
  if (connectBtn) connectBtn.style.display = "none";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showAppView(defaultTab = "proposalsTab") {
  const landing = document.getElementById("landingView");
  const app = document.getElementById("appView");
  const landingNav = document.getElementById("landingNavLinks");
  const appNav = document.getElementById("appNavTabs");
  const launchBtn = document.getElementById("launchAppTopBtn");
  const connectBtn = document.getElementById("connectWalletBtn");

  if (landing) landing.style.display = "none";
  if (app) app.style.display = "block";
  if (landingNav) landingNav.style.display = "none";
  if (appNav) appNav.style.display = "flex";
  if (launchBtn) launchBtn.style.display = "none";
  if (connectBtn) connectBtn.style.display = "inline-flex";
  switchTab(defaultTab);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function selectVoteOption(option) {
  state.selectedVoteOption = option;
  resetVoteButtons();

  const confirmBtn = document.getElementById("confirmVoteBtn");
  confirmBtn.disabled = false;

  if (option === 1) {
    document.getElementById("btnVoteFor").classList.add("selected-for");
    confirmBtn.innerText = "Confirm Vote: FOR (Sign Transaction)";
  } else if (option === 0) {
    document.getElementById("btnVoteAgainst").classList.add("selected-against");
    confirmBtn.innerText = "Confirm Vote: AGAINST (Sign Transaction)";
  } else if (option === 2) {
    document.getElementById("btnVoteAbstain").classList.add("selected-abstain");
    confirmBtn.innerText = "Confirm Vote: ABSTAIN (Sign Transaction)";
  }
}

function switchTab(tabId) {
  if (!tabId) return;
  document.querySelectorAll("#appNavTabs .nav-tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
  });
  document.querySelectorAll(".tab-pane").forEach((pane) => {
    pane.style.display = pane.id === tabId ? "block" : "none";
  });
}

window.showLandingView = showLandingView;
window.showAppView = showAppView;
window.switchTab = switchTab;

// --- Utilities ---
function truncateAddress(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatNumber(num) {
  const n = Number(num);
  if (isNaN(n)) return "0";
  return new Intl.NumberFormat().format(n);
}

function formatTimeRemaining(endTime, now, isFinalized) {
  if (isFinalized) return "Voting Concluded";
  const diff = endTime - now;
  if (diff <= 0) return "Voting Ended";

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

function escapeHTML(str) {
  if (!str) return "";
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

function decodeContractError(err) {
  const msg = err.reason || err.message || "";
  if (msg.includes("ProposerBelowThreshold")) return "Proposer does not meet the minimum 100 VOX threshold.";
  if (msg.includes("AlreadyVoted")) return "This wallet has already voted on this proposal.";
  if (msg.includes("VotingNotStarted")) return "Voting period has not started yet.";
  if (msg.includes("VotingAlreadyEnded")) return "Voting period has ended.";
  if (msg.includes("VotingPowerZero")) return "You have 0 voting power at the proposal's snapshot block.";
  if (msg.includes("FaucetCooldownActive")) return "Faucet cooldown is active (24 hours per wallet).";
  if (msg.includes("user rejected action")) return "Transaction rejected by user.";
  return msg.slice(0, 120);
}

function showToast(type, title, message) {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const indicator = type === "success"
    ? `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#ffffff; box-shadow:0 0 8px rgba(255,255,255,0.8);"></span>`
    : type === "error"
    ? `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#ef4444; box-shadow:0 0 8px rgba(239,68,68,0.8);"></span>`
    : `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#94a3b8;"></span>`;
  toast.innerHTML = `
    <div style="display:flex; align-items:center; padding-top:4px;">${indicator}</div>
    <div style="flex: 1;">
      <div class="toast-title">${escapeHTML(title)}</div>
      <div class="toast-msg">${escapeHTML(message)}</div>
    </div>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.4s ease";
    setTimeout(() => toast.remove(), 400);
  }, 4500);
}
