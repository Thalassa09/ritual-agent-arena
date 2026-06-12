// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/RitualAgentArena.sol";

contract DeployRitualArena is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        RitualAgentArena arena = new RitualAgentArena();
        
        console.log("RitualAgentArena deployed at:", address(arena));
        console.log("Network: Ritual Testnet (Chain ID 1979)");
        
        vm.stopBroadcast();
    }
}