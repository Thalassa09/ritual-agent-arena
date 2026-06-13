// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RitualAgentArena {
    struct Agent {
        uint256 id;
        string name;
        uint256 power;
        uint256 wins;
        uint256 rating;
        address owner;
    }

    uint256 public nextAgentId = 1;
    mapping(uint256 => Agent) public agents;
    mapping(address => uint256[]) public ownerAgents;

    event AgentMinted(uint256 indexed id, address indexed owner, string name, uint256 power);
    event BattleResult(uint256 indexed winnerId, uint256 indexed loserId, uint256 reward);
    event PowerIncreased(uint256 indexed agentId, uint256 oldPower, uint256 newPower);

    function mintAgent(string memory name, uint256 power) external returns (uint256) {
        require(power >= 80 && power <= 100, "Power must be 80-100");
        
        uint256 agentId = nextAgentId++;
        
        agents[agentId] = Agent({
            id: agentId,
            name: name,
            power: power,
            wins: 0,
            rating: 1500,
            owner: msg.sender
        });
        
        ownerAgents[msg.sender].push(agentId);
        
        emit AgentMinted(agentId, msg.sender, name, power);
        return agentId;
    }

    function battle(uint256 agentId1, uint256 agentId2) external {
        require(agents[agentId1].owner == msg.sender || agents[agentId2].owner == msg.sender, "Not owner");
        require(agents[agentId1].power > 0 && agents[agentId2].power > 0, "Invalid agents");
        
        // Winner determined by power — higher power wins
        uint256 power1 = agents[agentId1].power;
        uint256 power2 = agents[agentId2].power;
        
        uint256 winnerId;
        uint256 loserId;
        
        if (power1 > power2) {
            winnerId = agentId1;
            loserId = agentId2;
        } else if (power2 > power1) {
            winnerId = agentId2;
            loserId = agentId1;
        } else {
            // Equal power — timestamp tiebreaker
            winnerId = block.timestamp % 2 == 0 ? agentId1 : agentId2;
            loserId = winnerId == agentId1 ? agentId2 : agentId1;
        }

        // Store old power before increase
        uint256 oldWinnerPower = agents[winnerId].power;
        
        // Winner gets +8-10 power (8, 9, or 10)
        // Using block.timestamp for pseudo-randomness: 8 + (timestamp % 3)
        uint256 powerIncrease = 8 + (block.timestamp % 3);
        agents[winnerId].power += powerIncrease;
        
        // Loser's power stays the same (no decrease)
        
        // Update wins and ratings
        agents[winnerId].wins += 1;
        agents[winnerId].rating += 25;
        agents[loserId].rating = agents[loserId].rating > 25 ? agents[loserId].rating - 25 : 1000;

        emit BattleResult(winnerId, loserId, 42);
        emit PowerIncreased(winnerId, oldWinnerPower, agents[winnerId].power);
    }

    function getAgent(uint256 agentId) external view returns (Agent memory) {
        return agents[agentId];
    }
}
