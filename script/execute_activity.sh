#!/bin/bash
set -e

RPC_URL="https://rpc.bohr.life"
CHAIN_ID="968"
DAO_ADDR="0xc420dd65a7b3aa2c231f85ae9de7d7207013775c"
TOKEN_ADDR="0xce1d3e246ea627534c899651672fd7d2cddbab56"

DEPLOYER_KEY=$(grep PRIVATE_KEY .env | cut -d= -f2 | tr -d ' ' | tr -d '"')
DEPLOYER_ADDR=$(cast wallet address --private-key "$DEPLOYER_KEY")

echo "=== BotChain Testnet (Chain ID $CHAIN_ID) Community Interaction Suite ==="
echo "Deployer Address: $DEPLOYER_ADDR"
DEPLOYER_BAL=$(cast balance --rpc-url "$RPC_URL" --ether "$DEPLOYER_ADDR")
echo "Deployer Balance: $DEPLOYER_BAL BOT"

# 1. Create Wallet 2 (Community Member 2)
WALLET2_DATA=$(cast wallet new)
WALLET2_KEY=$(echo "$WALLET2_DATA" | grep "Private key:" | awk '{print $3}')
WALLET2_ADDR=$(echo "$WALLET2_DATA" | grep "Address:" | awk '{print $2}')
echo ""
echo "--- Wallet 2 Created: $WALLET2_ADDR ---"

# 2. Create Wallet 3 (Community Member 3)
WALLET3_DATA=$(cast wallet new)
WALLET3_KEY=$(echo "$WALLET3_DATA" | grep "Private key:" | awk '{print $3}')
WALLET3_ADDR=$(echo "$WALLET3_DATA" | grep "Address:" | awk '{print $2}')
echo "--- Wallet 3 Created: $WALLET3_ADDR ---"

# 3. Fund Wallet 2 with 0.05 BOT
echo ""
echo "[Tx 1] Funding Wallet 2 with 0.05 BOT..."
TX1=$(cast send --rpc-url "$RPC_URL" --private-key "$DEPLOYER_KEY" "$WALLET2_ADDR" --value 0.05ether --json | jq -r .transactionHash)
echo "Tx 1 Hash: $TX1"

# 4. Fund Wallet 3 with 0.05 BOT
echo ""
echo "[Tx 2] Funding Wallet 3 with 0.05 BOT..."
TX2=$(cast send --rpc-url "$RPC_URL" --private-key "$DEPLOYER_KEY" "$WALLET3_ADDR" --value 0.05ether --json | jq -r .transactionHash)
echo "Tx 2 Hash: $TX2"

# 5. Wallet 2 claims 1,000 VOX from Faucet (auto-delegates power to self)
echo ""
echo "[Tx 3] Wallet 2 claiming 1,000 VOX from Faucet..."
TX3=$(cast send --rpc-url "$RPC_URL" --private-key "$WALLET2_KEY" "$TOKEN_ADDR" "claimFaucet(address)" "$WALLET2_ADDR" --json | jq -r .transactionHash)
echo "Tx 3 Hash: $TX3"

# 6. Wallet 3 claims 1,000 VOX from Faucet (auto-delegates power to self)
echo ""
echo "[Tx 4] Wallet 3 claiming 1,000 VOX from Faucet..."
TX4=$(cast send --rpc-url "$RPC_URL" --private-key "$WALLET3_KEY" "$TOKEN_ADDR" "claimFaucet(address)" "$WALLET3_ADDR" --json | jq -r .transactionHash)
echo "Tx 4 Hash: $TX4"

# 7. Wallet 2 creates Proposal #2
echo ""
echo "[Tx 5] Wallet 2 creating Proposal #2: 'VIP-002: BotChain Security Audit Pool'..."
TX5=$(cast send --rpc-url "$RPC_URL" --private-key "$WALLET2_KEY" "$DAO_ADDR" \
  "createProposal(string,string,string,uint256,uint256,address,uint256,bytes)" \
  "VIP-002: BotChain Security & Ecosystem Liquidity Pool" \
  "Allocates 0.02 BOT toward autonomous security monitoring and automated vulnerability fuzzing for native BotChain protocols." \
  "Security" \
  259200 \
  500000000000000000000 \
  "$WALLET2_ADDR" \
  20000000000000000 \
  "0x" \
  --json | jq -r .transactionHash)
echo "Tx 5 Hash: $TX5"

# 8. Wallet 3 casts vote on Proposal #2
echo ""
echo "[Tx 6] Wallet 3 voting FOR on Proposal #2..."
TX6=$(cast send --rpc-url "$RPC_URL" --private-key "$WALLET3_KEY" "$DAO_ADDR" \
  "castVoteWithReason(uint256,uint8,string)" \
  2 \
  1 \
  "Community member endorses automated security audits for BotChain" \
  --json | jq -r .transactionHash)
echo "Tx 6 Hash: $TX6"

# 9. Deployer casts vote on Proposal #2
echo ""
echo "[Tx 7] Deployer voting FOR on Proposal #2..."
TX7=$(cast send --rpc-url "$RPC_URL" --private-key "$DEPLOYER_KEY" "$DAO_ADDR" \
  "castVoteWithReason(uint256,uint8,string)" \
  2 \
  1 \
  "Core team voting FOR ecosystem tooling security grant" \
  --json | jq -r .transactionHash)
echo "Tx 7 Hash: $TX7"

echo ""
echo "=== SUMMARY OF COMPLETED ON-CHAIN TRANSACTIONS ==="
echo "Wallet 1 (Deployer): $DEPLOYER_ADDR"
echo "Wallet 2 (Community Member): $WALLET2_ADDR"
echo "Wallet 3 (Community Member): $WALLET3_ADDR"
echo "Tx 1 (Fund Wallet 2): https://scan.bohr.life/tx/$TX1"
echo "Tx 2 (Fund Wallet 3): https://scan.bohr.life/tx/$TX2"
echo "Tx 3 (Faucet Claim 2): https://scan.bohr.life/tx/$TX3"
echo "Tx 4 (Faucet Claim 3): https://scan.bohr.life/tx/$TX4"
echo "Tx 5 (Create Proposal #2): https://scan.bohr.life/tx/$TX5"
echo "Tx 6 (Vote by Wallet 3): https://scan.bohr.life/tx/$TX6"
echo "Tx 7 (Vote by Deployer): https://scan.bohr.life/tx/$TX7"
