import os
import json
import time
from eth_account import Account
from web3 import Web3
from dotenv import load_dotenv

load_dotenv(".env")
RPC_URL = "https://rpc.bohr.life"
CHAIN_ID = 968

w3 = Web3(Web3.HTTPProvider(RPC_URL))
print("Connected to BotChain Testnet:", w3.is_connected())

# Deployer
deployer_key = os.getenv("PRIVATE_KEY")
deployer = Account.from_key(deployer_key)
print(f"Deployer Address: {deployer.address}")
print(f"Deployer Balance: {w3.from_wei(w3.eth.get_balance(deployer.address), 'ether')} BOT")

# Contract Addresses
DAO_ADDR = "0xc420dd65a7b3aa2c231f85ae9de7d7207013775c"
TOKEN_ADDR = "0xce1d3e246ea627534c899651672fd7d2cddbab56"

# Contract ABIs
TOKEN_ABI = [
    {"inputs":[{"internalType":"address","name":"recipient","type":"address"}],"name":"claimFaucet","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"delegatee","type":"address"}],"name":"delegate","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"getVotes","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
]

DAO_ABI = [
    {"inputs":[{"internalType":"string","name":"title","type":"string"},{"internalType":"string","name":"description","type":"string"},{"internalType":"string","name":"category","type":"string"},{"internalType":"uint256","name":"duration","type":"uint256"},{"internalType":"uint256","name":"customQuorum","type":"uint256"},{"internalType":"address","name":"target","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"bytes","name":"callData","type":"bytes"}],"name":"createProposal","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"proposalId","type":"uint256"},{"internalType":"uint8","name":"support","type":"uint8"},{"internalType":"string","name":"reason","type":"string"}],"name":"castVoteWithReason","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"proposalId","type":"uint256"}],"name":"getProposal","outputs":[{"components":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"address","name":"proposer","type":"address"},{"internalType":"string","name":"title","type":"string"},{"internalType":"string","name":"description","type":"string"},{"internalType":"string","name":"category","type":"string"},{"internalType":"uint256","name":"startBlock","type":"uint256"},{"internalType":"uint256","name":"startTime","type":"uint256"},{"internalType":"uint256","name":"endTime","type":"uint256"},{"internalType":"uint256","name":"quorum","type":"uint256"},{"internalType":"uint256","name":"minVotingPower","type":"uint256"},{"internalType":"address","name":"target","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"bytes","name":"callData","type":"bytes"},{"internalType":"uint256","name":"forVotes","type":"uint256"},{"internalType":"uint256","name":"againstVotes","type":"uint256"},{"internalType":"uint256","name":"abstainVotes","type":"uint256"},{"internalType":"uint256","name":"totalVoters","type":"uint256"},{"internalType":"bool","name":"finalized","type":"bool"},{"internalType":"bool","name":"passed","type":"bool"},{"internalType":"bool","name":"executed","type":"bool"},{"internalType":"bool","name":"canceled","type":"bool"}],"internalType":"struct VoxDAO.Proposal","name":"","type":"tuple"}],"stateMutability":"view","type":"function"}
]

token_contract = w3.eth.contract(address=Web3.to_checksum_address(TOKEN_ADDR), abi=TOKEN_ABI)
dao_contract = w3.eth.contract(address=Web3.to_checksum_address(DAO_ADDR), abi=DAO_ABI)

# Helper to send tx
def send_tx(signer, tx_data):
    nonce = w3.eth.get_transaction_count(signer.address)
    tx = tx_data.copy()
    tx['nonce'] = nonce
    tx['gas'] = tx_data.get('gas', 400000)
    tx['gasPrice'] = w3.to_wei('5', 'gwei')
    tx['chainId'] = CHAIN_ID
    signed = w3.eth.account.sign_transaction(tx, signer.key)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    print(f"Sent tx: {tx_hash.hex()} ... waiting receipt")
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
    print(f"Mined in block {receipt.blockNumber}, status={receipt.status}")
    time.sleep(2)
    return receipt

# Generate 2 deterministic community tester accounts
member2 = Account.create("BOTCHAIN_COMMUNITY_TESTER_2_VOXDAO")
member3 = Account.create("BOTCHAIN_COMMUNITY_TESTER_3_VOXDAO")

print(f"\n--- Member 2 Address: {member2.address} ---")
print(f"--- Member 3 Address: {member3.address} ---")

# Step 1: Fund Member 2 and Member 3 with 0.05 BOT gas each
print("\n[Action 1] Funding Member 2 with 0.05 BOT...")
send_tx(deployer, {
    'to': member2.address,
    'value': w3.to_wei(0.05, 'ether'),
    'gas': 21000
})

print("\n[Action 2] Funding Member 3 with 0.05 BOT...")
send_tx(deployer, {
    'to': member3.address,
    'value': w3.to_wei(0.05, 'ether'),
    'gas': 21000
})

# Step 2: Member 2 claims 1,000 VOX from Faucet
print("\n[Action 3] Member 2 claiming 1,000 VOX faucet...")
tx_data = token_contract.functions.claimFaucet(member2.address).build_transaction({
    'from': member2.address,
    'gas': 300000
})
send_tx(member2, tx_data)

# Step 3: Member 3 claims 1,000 VOX from Faucet
print("\n[Action 4] Member 3 claiming 1,000 VOX faucet...")
tx_data = token_contract.functions.claimFaucet(member3.address).build_transaction({
    'from': member3.address,
    'gas': 300000
})
send_tx(member3, tx_data)

# Step 4: Member 2 creates Proposal #2: "VIP-002: BotChain Native Security Audit & Liquidity Pool"
print("\n[Action 5] Member 2 creating Proposal #2 on-chain...")
tx_data = dao_contract.functions.createProposal(
    "VIP-002: BotChain Security & Ecosystem Liquidity Pool",
    "Allocates 0.02 BOT toward autonomous security monitoring and automated vulnerability fuzzing for native BotChain protocols.",
    "Treasury",
    72 * 3600,
    500 * 10**18,
    member2.address,
    w3.to_wei(0.02, 'ether'),
    b""
).build_transaction({
    'from': member2.address,
    'gas': 500000
})
r5 = send_tx(member2, tx_data)

# Step 5: Member 3 votes FOR Proposal #2 with reason
print("\n[Action 6] Member 3 voting FOR Proposal #2 with on-chain reason...")
tx_data = dao_contract.functions.castVoteWithReason(
    2,
    1, # FOR
    "Full community support for continuous smart contract auditing on BotChain."
).build_transaction({
    'from': member3.address,
    'gas': 300000
})
r6 = send_tx(member3, tx_data)

# Step 6: Deployer votes FOR Proposal #2 with reason
print("\n[Action 7] Deployer voting FOR Proposal #2 with on-chain reason...")
tx_data = dao_contract.functions.castVoteWithReason(
    2,
    1, # FOR
    "Founding team endorses ecosystem security tooling."
).build_transaction({
    'from': deployer.address,
    'gas': 300000
})
r7 = send_tx(deployer, tx_data)

print("\n--- ALL ACTIONS COMPLETED SUCCESSFULLY! ---")
