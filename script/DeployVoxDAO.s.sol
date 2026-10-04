// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {VoxToken} from "../src/VoxToken.sol";
import {VoxDAO} from "../src/VoxDAO.sol";

contract DeployVoxDAO is Script {
    function getPrivateKey() internal view returns (uint256) {
        string memory keyStr = vm.envString("PRIVATE_KEY");
        bytes memory keyBytes = bytes(keyStr);
        if (keyBytes.length >= 2 && keyBytes[0] == "0" && (keyBytes[1] == "x" || keyBytes[1] == "X")) {
            return vm.parseUint(keyStr);
        } else {
            return vm.parseUint(string.concat("0x", keyStr));
        }
    }

    function run() external returns (address tokenAddress, address daoAddress) {
        uint256 deployerPrivateKey = getPrivateKey();
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying VoxDAO ecosystem to BotChain...");
        console.log("Deployer address:", deployer);
        console.log("Deployer balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy VoxToken with 10M initial supply to deployer
        VoxToken token = new VoxToken(
            "Vox Governance Token",
            "VOX",
            10_000_000 * 1e18,
            deployer
        );
        console.log("VoxToken deployed at:", address(token));

        // 2. Deploy VoxDAO
        // Parameters:
        // - proposalThreshold: 100 VOX
        // - votingDelay: 0 seconds (instant activation)
        // - minVotingPeriod: 120 seconds (2 minutes for snappy verification & demos)
        // - defaultQuorum: 500 VOX
        VoxDAO dao = new VoxDAO(
            address(token),
            "BotChain Pioneer DAO",
            "Official decentralized community governance space for BotChain builders, validators, and AI native projects.",
            100 * 1e18,
            0,
            120,
            500 * 1e18,
            deployer
        );
        console.log("VoxDAO deployed at:", address(dao));

        // 3. Fund DAO treasury with a small amount of native BOT (e.g. 0.1 tBOT) if balance permits
        if (deployer.balance >= 0.2 ether) {
            (bool funded, ) = address(dao).call{value: 0.1 ether}("");
            if (funded) {
                console.log("Funded VoxDAO treasury with 0.1 BOT");
            }
        }

        // 4. Create an initial benchmark governance proposal so the space is immediately active and verifiable
        uint256 proposalId = dao.createProposal(
            "VIP-001: Community AI & Developer Grant Program",
            "Allocate 0.05 BOT to fund high-impact open-source developer tooling and autonomous agent integrations across the BotChain ecosystem.",
            "Treasury",
            3 days,
            500 * 1e18,
            deployer,
            0.05 ether,
            ""
        );
        console.log("Created initial proposal ID:", proposalId);

        vm.stopBroadcast();

        tokenAddress = address(token);
        daoAddress = address(dao);
    }
}
