// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RitualAgentArena {
    struct Agent {
        uint256 id;
        string name;
        uint256 wins;
        uint256 rating;
        address owner;
    }

    uint256 public nextAgentId = 1;
    mapping(uint256 => Agent) public agents;
    mapping(address => uint256[]) public ownerAgents;

    event AgentMinted(uint256 indexed id, address indexed owner, string name);
    event BattleResult(uint256 indexed winnerId, uint256 indexed loserId, uint256 reward);

    function mintAgent(string memory name) external returns (uint256) {
        uint256 agentId = nextAgentId++;
        
        agents[agentId] = Agent({
            id: agentId,
            name: name,
            wins: 0,
            rating: 1500,
            owner: msg.sender
        });
        
        ownerAgents[msg.sender].push(agentId);
        
        emit AgentMinted(agentId, msg.sender, name);
        return agentId;
    }

    function battle(uint256 agentId1, uint256 agentId2) external {
        require(agents[agentId1].owner == msg.sender || agents[agentId2].owner == msg.sender, "Not owner");
        
        uint256 winnerId = block.timestamp % 2 == 0 ? agentId1 : agentId2;
        uint256 loserId = winnerId == agentId1 ? agentId2 : agentId1;

        agents[winnerId].wins += 1;
        agents[winnerId].rating += 25;
        agents[loserId].rating = agents[loserId].rating > 25 ? agents[loserId].rating - 25 : 1000;

        emit BattleResult(winnerId, loserId, 42);
    }

    function getAgent(uint256 agentId) external view returns (Agent memory) {
        return agents[agentId];
    }
}