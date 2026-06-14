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

    struct StakeInfo {
        uint256 amount;
        uint256 startTime;
        uint256 lastClaimTime;
        uint256 totalClaimed;
    }

    uint256 public nextAgentId = 1;
    mapping(uint256 => Agent) public agents;
    mapping(address => uint256[]) public ownerAgents;
    
    // Staking
    mapping(address => StakeInfo) public stakes;
    uint256 public dailyPowerReward = 10; // 10 power per day for stakers
    uint256 public minStakeAmount = 0.01 ether;

    event AgentMinted(uint256 indexed id, address indexed owner, string name, uint256 power);
    event BattleResult(uint256 indexed winnerId, uint256 indexed loserId, uint256 reward);
    event PowerIncreased(uint256 indexed agentId, uint256 oldPower, uint256 newPower);
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event PowerClaimed(address indexed user, uint256 agentId, uint256 powerGained);

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
            winnerId = block.timestamp % 2 == 0 ? agentId1 : agentId2;
            loserId = winnerId == agentId1 ? agentId2 : agentId1;
        }

        uint256 oldWinnerPower = agents[winnerId].power;
        
        // Winner gets +8-10 power
        uint256 powerIncrease = 8 + (block.timestamp % 3);
        agents[winnerId].power += powerIncrease;
        
        agents[winnerId].wins += 1;
        agents[winnerId].rating += 25;
        agents[loserId].rating = agents[loserId].rating > 25 ? agents[loserId].rating - 25 : 1000;

        emit BattleResult(winnerId, loserId, 42);
        emit PowerIncreased(winnerId, oldWinnerPower, agents[winnerId].power);
    }

    // ═══════════════════════════════════════════════════════
    // STAKING — stake RITUAL to earn daily power for your agents
    // ═══════════════════════════════════════════════════════

    function stake() external payable {
        require(msg.value >= minStakeAmount, "Minimum stake is 0.01 RITUAL");
        
        StakeInfo storage s = stakes[msg.sender];
        
        // If already staking, claim pending power first
        if (s.amount > 0 && s.lastClaimTime > 0) {
            uint256 pending = _calculatePendingPower(msg.sender);
            if (pending > 0) {
                // Auto-apply to first agent
                uint256[] memory myAgents = ownerAgents[msg.sender];
                if (myAgents.length > 0) {
                    uint256 agentId = myAgents[0];
                    agents[agentId].power += pending;
                    s.totalClaimed += pending;
                    emit PowerClaimed(msg.sender, agentId, pending);
                }
            }
        }
        
        s.amount += msg.value;
        if (s.startTime == 0) {
            s.startTime = block.timestamp;
        }
        s.lastClaimTime = block.timestamp;
        
        emit Staked(msg.sender, msg.value);
    }

    function unstake() external {
        StakeInfo storage s = stakes[msg.sender];
        require(s.amount > 0, "Nothing staked");
        
        // Claim any pending power before unstaking
        uint256 pending = _calculatePendingPower(msg.sender);
        if (pending > 0) {
            uint256[] memory myAgents = ownerAgents[msg.sender];
            if (myAgents.length > 0) {
                uint256 agentId = myAgents[0];
                agents[agentId].power += pending;
                s.totalClaimed += pending;
                emit PowerClaimed(msg.sender, agentId, pending);
            }
        }
        
        uint256 amount = s.amount;
        s.amount = 0;
        s.startTime = 0;
        s.lastClaimTime = 0;
        
        // Transfer back
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Unstaked(msg.sender, amount);
    }

    function claimPower() external {
        StakeInfo storage s = stakes[msg.sender];
        require(s.amount > 0, "Nothing staked");
        
        uint256 pending = _calculatePendingPower(msg.sender);
        require(pending > 0, "No power to claim");
        
        uint256[] memory myAgents = ownerAgents[msg.sender];
        require(myAgents.length > 0, "No agents to receive power");
        
        // Apply to agent with lowest power (weakest gets boosted)
        uint256 targetAgent = myAgents[0];
        uint256 lowestPower = agents[myAgents[0]].power;
        for (uint256 i = 1; i < myAgents.length; i++) {
            if (agents[myAgents[i]].power < lowestPower) {
                lowestPower = agents[myAgents[i]].power;
                targetAgent = myAgents[i];
            }
        }
        
        agents[targetAgent].power += pending;
        s.lastClaimTime = block.timestamp;
        s.totalClaimed += pending;
        
        emit PowerClaimed(msg.sender, targetAgent, pending);
    }

    function getStakeInfo(address user) external view returns (
        uint256 amount,
        uint256 startTime,
        uint256 lastClaimTime,
        uint256 totalClaimed,
        uint256 pendingPower,
        uint256 daysStaked
    ) {
        StakeInfo storage s = stakes[user];
        amount = s.amount;
        startTime = s.startTime;
        lastClaimTime = s.lastClaimTime;
        totalClaimed = s.totalClaimed;
        
        if (s.amount > 0 && s.startTime > 0) {
            pendingPower = _calculatePendingPower(user);
            daysStaked = (block.timestamp - s.startTime) / 1 days;
        }
    }

    function _calculatePendingPower(address user) internal view returns (uint256) {
        StakeInfo storage s = stakes[user];
        if (s.amount == 0 || s.lastClaimTime == 0) return 0;
        
        uint256 elapsed = block.timestamp - s.lastClaimTime;
        uint256 elapsedDays = elapsed / 1 days;
        
        // Scale power by stake amount: 0.01 ETH = 10 power/day, 0.1 ETH = 100 power/day (capped)
        uint256 stakeMultiple = s.amount / minStakeAmount; // 1x per 0.01 ETH
        if (stakeMultiple > 10) stakeMultiple = 10; // Cap at 10x (0.1 ETH)
        
        return elapsedDays * dailyPowerReward * stakeMultiple;
    }

    function getAgent(uint256 agentId) external view returns (Agent memory) {
        return agents[agentId];
    }
}
