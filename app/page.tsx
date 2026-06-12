'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sword, Trophy, Users, Zap, LogOut, Plus, ArrowRight, Shuffle } from 'lucide-react';
import { ethers } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

const RITUAL_RPC = 'https://rpc.ritualfoundation.org';
const RITUAL_CHAIN_ID = 1979;
const CONTRACT_ADDRESS = '0x411fA6BEBfECE74293AC1B74d1f906688A13763D';

const ABI = [
  "function mintAgent(string name) external returns (uint256)",
  "function battle(uint256 agentId1, uint256 agentId2) external"
];

interface MintedAgent {
  id: number;
  name: string;
  xHandle: string;
  wallet: string;
  power: number;
  wins: number;
}

// Ultra Premium Cinematic Background
const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#0A0A0B]">
      <div className="absolute inset-0 bg-[radial-gradient(#1F1F23_0.5px,transparent_1px)] bg-[length:3px_3px] opacity-70" />

      {/* Large elegant moving orbs */}
      <motion.div
        className="absolute -top-[55%] -left-[30%] w-[1500px] h-[1500px] rounded-full"
        style={{ background: 'radial-gradient(circle at 40% 35%, rgba(180,140,85,0.08) 0%, transparent 70%)' }}
        animate={{ x: [0, 200, -100, 0], y: [0, 120, -80, 0], scale: [1, 1.18, 0.9, 1] }}
        transition={{ duration: 60, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute -bottom-[50%] -right-[22%] w-[1300px] h-[1300px] rounded-full"
        style={{ background: 'radial-gradient(circle at 65% 60%, rgba(120,90,160,0.06) 0%, transparent 70%)' }}
        animate={{ x: [0, -180, 90, 0], y: [0, -110, 70, 0], scale: [1, 1.15, 0.92, 1] }}
        transition={{ duration: 68, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Elegant moving light lines */}
      {Array.from({ length: 7 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-px bg-gradient-to-r from-transparent via-[#C5A26F] to-transparent"
          style={{ left: `${5 + i * 14}%`, top: `${12 + i * 11}%`, width: `${380 + i * 35}px`, opacity: 0.15 + (i % 3) * 0.06 }}
          animate={{ x: [0, 260, -130, 0], opacity: [0.08, 0.32, 0.08] }}
          transition={{ duration: 24 + i * 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Floating particles */}
      {Array.from({ length: 32 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-[#C5A26F]"
          style={{ left: `${(i * 5 + 2) % 100}%`, top: `${(i * 8 + 5) % 100}%`, width: i % 3 === 0 ? '3.5px' : '1.8px', height: i % 3 === 0 ? '3.5px' : '1.8px' }}
          animate={{ y: [0, -280, 0], x: [0, (i % 4 === 0 ? 60 : -48), 0], opacity: [0, 0.7, 0], scale: [0.4, 2, 0.4] }}
          transition={{ duration: 15 + (i % 9), repeat: Infinity, delay: i * 0.22, ease: "easeInOut" }}
        />
      ))}

      <div className="absolute inset-0 bg-[linear-gradient(to_right,#161619_1px,transparent_1px)] bg-[length:200px_200px] opacity-40" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#161619_1px,transparent_1px)] bg-[length:200px_200px] opacity-40" />
    </div>
  );
};

const randomNames = ["Shadow", "Void", "Nexus", "Aether", "Eclipse", "Phantom", "Nova", "Rift", "Specter", "Quantum", "Nebula", "Vortex", "Astral", "Chronos", "Elysium", "Obsidian", "Celestia", "Helix", "Orion", "Zenith", "Lunar", "Solstice"];
const randomSuffixes = ["Oracle", "Weaver", "Striker", "Knight", "Reaper", "Warden", "Sage", "Hunter", "Lord", "Walker"];

const generateRandomAgentName = () => {
  const name = randomNames[Math.floor(Math.random() * randomNames.length)];
  const suffix = randomSuffixes[Math.floor(Math.random() * randomSuffixes.length)];
  return `${name} ${suffix}`;
};

export default function RitualAgentArena() {
  const [account, setAccount] = useState<string>('');
  const [contract, setContract] = useState<any>(null);
  
  const [mintedAgents, setMintedAgents] = useState<MintedAgent[]>([
    { id: 1, name: "Shadow Oracle", xHandle: "shadoworacle", wallet: "0x000", power: 91, wins: 12 },
    { id: 2, name: "Void Weaver", xHandle: "voidweaver", wallet: "0x000", power: 87, wins: 9 },
    { id: 3, name: "Nexus Striker", xHandle: "nexusstriker", wallet: "0x000", power: 94, wins: 15 },
    { id: 4, name: "Aether Knight", xHandle: "aetherknight", wallet: "0x000", power: 83, wins: 8 },
    { id: 5, name: "Eclipse Reaper", xHandle: "eclipsereaper", wallet: "0x000", power: 89, wins: 11 },
  ]);
  
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [isBattling, setIsBattling] = useState(false);
  const [battleResult, setBattleResult] = useState<string>('');

  const [showMintModal, setShowMintModal] = useState(false);
  const [mintName, setMintName] = useState('');
  const [mintX, setMintX] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const ADMIN_X_HANDLES = ["ohmythalassa"];
  const ADMIN_ADDRESSES = ["0x3883f0ddccc55ac112173bc67584952bf13b1a7d"];

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Install MetaMask");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    await switchToRitual();
    const signer = await provider.getSigner();
    const ritualContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
    setAccount(accounts[0]);
    setContract(ritualContract);
  };

  const disconnectWallet = () => {
    setAccount('');
    setContract(null);
  };

  const switchToRitual = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x' + RITUAL_CHAIN_ID.toString(16) }],
      });
    } catch (err: any) {
      if (err.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x' + RITUAL_CHAIN_ID.toString(16),
            chainName: 'Ritual Testnet',
            nativeCurrency: { name: 'RITUAL', symbol: 'RITUAL', decimals: 18 },
            rpcUrls: [RITUAL_RPC],
          }],
        });
      }
    }
  };

  const openMintModal = () => {
    if (!contract) return alert("Connect wallet first");

    const isAdminByAddress = ADMIN_ADDRESSES.includes(account.toLowerCase());
    const isAdminByX = mintedAgents.some(a => 
      ADMIN_X_HANDLES.includes(a.xHandle.toLowerCase()) && a.wallet.toLowerCase() === account.toLowerCase()
    );

    if (!isAdminByAddress && !isAdminByX) {
      const alreadyMinted = mintedAgents.find(a => a.wallet.toLowerCase() === account.toLowerCase());
      if (alreadyMinted) {
        alert("This wallet has already minted an agent. 1 wallet = 1 agent.");
        return;
      }
    }

    setShowMintModal(true);
    setMintName('');
    setMintX('');
    setErrorMsg('');
  };

  const closeMintModal = () => {
    setShowMintModal(false);
    setErrorMsg('');
  };

  const generateRandomName = () => {
    const randomName = generateRandomAgentName();
    setMintName(randomName);
    setErrorMsg('');
  };

  const mintNewAgent = async () => {
    if (!contract || !mintName.trim() || !mintX.trim()) return;

    const nameLower = mintName.trim().toLowerCase();
    const xLower = mintX.trim().toLowerCase();

    if (mintedAgents.find(a => a.name.toLowerCase() === nameLower)) {
      setErrorMsg("Agent name already taken");
      return;
    }
    if (mintedAgents.find(a => a.xHandle.toLowerCase() === xLower)) {
      setErrorMsg("X handle already taken");
      return;
    }

    try {
      const displayName = `${mintName.trim()} (@${mintX.trim()})`;
      const tx = await contract.mintAgent(displayName);
      await tx.wait();

      const power = Math.floor(Math.random() * 27) + 72;

      const newAgent: MintedAgent = {
        id: mintedAgents.length + 1,
        name: mintName.trim(),
        xHandle: mintX.trim(),
        wallet: account,
        power,
        wins: 0,
      };
      setMintedAgents([...mintedAgents, newAgent]);

      alert("Agent minted successfully!");
      closeMintModal();
    } catch (err) {
      console.error(err);
      alert("Mint failed");
    }
  };

  const enterArena = (agent: MintedAgent) => {
    setSelectedAgent(agent);
    setBattleResult('');
    setIsBattling(false);
  };

  const startBattle = async () => {
    if (!selectedAgent || !contract) return;
    
    setIsBattling(true);
    setBattleResult('');

    try {
      const opponents = mintedAgents.filter(a => a.id !== selectedAgent.id);
      if (opponents.length === 0) {
        setBattleResult("No other agents to battle");
        setIsBattling(false);
        return;
      }

      const opponent = opponents[Math.floor(Math.random() * opponents.length)];

      const myPower = selectedAgent.power;
      const oppPower = opponent.power;

      let resultText = "";

      if (myPower > oppPower) {
        resultText = `Victory! ${selectedAgent.name} defeated ${opponent.name} (${myPower} vs ${oppPower})`;
        
        const updated = mintedAgents.map(a => 
          a.id === selectedAgent.id ? { ...a, wins: a.wins + 1 } : a
        );
        setMintedAgents(updated);
        
      } else if (myPower < oppPower) {
        resultText = `Defeat. ${opponent.name} overpowered ${selectedAgent.name} (${oppPower} vs ${myPower})`;
      } else {
        resultText = `Draw! Both agents have equal power (${myPower})`;
      }

      setBattleResult(resultText);
    } catch (err) {
      console.error(err);
      setBattleResult("Battle failed on-chain");
    }
    setIsBattling(false);
  };

  const closeBattle = () => {
    setSelectedAgent(null);
    setBattleResult('');
    setIsBattling(false);
  };

  const totalAgents = mintedAgents.length;
  const totalBattles = 0;
  const avgRating = totalAgents > 0 ? 1700 : 0;

  const leaderboard = [...mintedAgents].sort((a, b) => b.wins - a.wins).slice(0, 5);

  return (
    <div className="min-h-screen text-white relative">
      <AnimatedBackground />

      {/* Header */}
      <div className="border-b border-white/10 bg-black/60 backdrop-blur-3xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-7 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#C5A26F] via-[#A67C52] to-[#8B5E3C] flex items-center justify-center shadow-xl">
              <Sword className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="font-semibold tracking-[-1.2px] text-3xl">Ritual</div>
              <div className="text-[10px] text-white/40 -mt-1 tracking-[4px]">AGENT ARENA</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {account ? (
              <div className="flex items-center gap-3">
                <div className="px-6 py-2.5 rounded-full bg-white/5 text-sm font-mono border border-white/10">
                  {account.slice(0,6)}...{account.slice(-4)}
                </div>
                <button onClick={disconnectWallet} className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-white/20 hover:bg-white/5 transition-all active:scale-[0.985]">
                  <LogOut className="w-4 h-4" /> Disconnect
                </button>
              </div>
            ) : (
              <button onClick={connectWallet} className="flex items-center gap-3 px-9 py-3.5 rounded-full bg-white text-black font-medium hover:bg-[#C5A26F] active:scale-[0.985] transition-all text-sm tracking-wider">
                CONNECT WALLET <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 pt-20 pb-24">
        {/* Hero */}
        <div className="text-center mb-24">
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full border border-white/10 bg-white/5 text-xs tracking-[4.5px] mb-9">
            RITUAL TESTNET • CHAIN 1979
          </div>
          <h1 className="text-[96px] leading-[86px] font-semibold tracking-[-7px] mb-7">
            Where Agents<br />Prove Their Worth
          </h1>
          <p className="text-2xl text-white/60 max-w-lg mx-auto tracking-[-0.5px]">
            Mint. Battle. Ascend.<br />On-chain combat on Ritual.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-20">
          {[
            { icon: Users, label: "Active Agents", value: totalAgents },
            { icon: Trophy, label: "Battles Fought", value: totalBattles },
            { icon: Zap, label: "Avg Rating", value: avgRating || "—" },
          ].map((stat, i) => (
            <div key={i} className="border border-white/10 rounded-3xl p-10 bg-white/[0.015] hover:bg-white/[0.03] transition-all group">
              <stat.icon className="w-5 h-5 text-[#C5A26F] mb-9 group-hover:scale-110 transition-transform" />
              <div className="text-7xl font-semibold tracking-[-3.5px] mb-1">{stat.value}</div>
              <div className="text-white/50 text-sm tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <div className="mb-20">
            <div className="flex items-center gap-4 mb-8 px-2">
              <Trophy className="w-6 h-6 text-[#C5A26F]" />
              <div className="text-4xl font-semibold tracking-[-2px]">Top Agents</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {leaderboard.map((agent, index) => (
                <div key={index} className="border border-white/10 rounded-3xl p-7 bg-white/[0.015] hover:border-[#C5A26F]/30 transition-all">
                  <div className="text-xs text-white/40 mb-3 tracking-widest">#{index + 1}</div>
                  <div className="font-semibold text-2xl tracking-[-1px] mb-1 leading-tight">{agent.name}</div>
                  <div className="text-[#C5A26F] text-sm mb-6">@{agent.xHandle}</div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-white/50 text-sm">Wins</span>
                    <span className="font-semibold text-5xl tracking-[-2px]">{agent.wins}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Minted Agents Table */}
        {mintedAgents.length > 0 && (
          <div className="mb-20">
            <div className="flex items-center justify-between mb-8 px-2">
              <div className="text-4xl font-semibold tracking-[-2px]">Minted Agents</div>
            </div>
            <div className="border border-white/10 rounded-3xl overflow-hidden bg-white/[0.015]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    <th className="text-left px-8 py-5 text-xs tracking-widest text-white/50 font-normal">#</th>
                    <th className="text-left px-8 py-5 text-xs tracking-widest text-white/50 font-normal">AGENT</th>
                    <th className="text-left px-8 py-5 text-xs tracking-widest text-white/50 font-normal">X HANDLE</th>
                    <th className="text-center px-8 py-5 text-xs tracking-widest text-white/50 font-normal">POWER</th>
                    <th className="text-center px-8 py-5 text-xs tracking-widest text-white/50 font-normal">WINS</th>
                  </tr>
                </thead>
                <tbody>
                  {mintedAgents.map((agent, index) => (
                    <tr key={index} className="border-b border-white/10 last:border-0 hover:bg-white/[0.025] transition-all cursor-pointer" onClick={() => enterArena(agent)}>
                      <td className="px-8 py-6 text-white/40 font-mono text-sm">{agent.id}</td>
                      <td className="px-8 py-6 font-medium text-lg tracking-[-0.5px]">{agent.name}</td>
                      <td className="px-8 py-6 text-[#C5A26F]">@{agent.xHandle}</td>
                      <td className="px-8 py-6 text-center font-mono text-lg">{agent.power}</td>
                      <td className="px-8 py-6 text-center font-semibold text-xl tracking-tight">{agent.wins}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Agent Roster Header */}
        <div className="flex items-center justify-between mb-8 px-2">
          <div>
            <div className="text-4xl font-semibold tracking-[-2px]">Agent Roster</div>
            <div className="text-white/50 mt-1">Choose your champion</div>
          </div>
          <button onClick={openMintModal} className="flex items-center gap-3 px-8 py-3.5 rounded-full border border-white/20 hover:bg-white/5 active:scale-[0.985] transition-all text-sm tracking-wider">
            <Plus className="w-4 h-4" /> MINT NEW AGENT
          </button>
        </div>

        {/* Empty State */}
        {mintedAgents.length === 0 && (
          <div className="border border-white/10 rounded-3xl p-20 text-center bg-white/[0.015]">
            <div className="mx-auto w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-8">
              <Users className="w-9 h-9 text-white/40" />
            </div>
            <div className="text-4xl font-semibold tracking-[-1.5px] mb-3">No agents yet</div>
            <div className="text-white/50 text-lg mb-10">Be the first to mint an agent on Ritual</div>
            <button onClick={openMintModal} className="px-10 py-4 rounded-full bg-white text-black font-medium hover:bg-[#C5A26F] active:scale-[0.985] transition-all text-sm tracking-wider">
              MINT YOUR FIRST AGENT
            </button>
          </div>
        )}
      </div>

      {/* Battle Modal */}
      <AnimatePresence>
        {selectedAgent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-6">
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.98 }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="w-full max-w-lg border border-white/10 rounded-3xl bg-[#0A0A0B] p-12 relative"
            >
              <button onClick={closeBattle} className="absolute top-8 right-8 text-white/40 hover:text-white text-xl">×</button>

              <div className="text-center">
                <div className="text-xs tracking-[4px] text-white/40 mb-3">ARENA MODE</div>
                <div className="text-6xl font-semibold tracking-[-3px] mb-3">{selectedAgent.name}</div>
                <div className="text-[#C5A26F] text-xl mb-12">Power {selectedAgent.power}</div>
              </div>

              {!battleResult && (
                <button
                  onClick={startBattle}
                  disabled={isBattling}
                  className="w-full py-5 rounded-2xl bg-white text-black font-medium flex items-center justify-center gap-3 hover:bg-[#C5A26F] disabled:opacity-60 active:scale-[0.985] transition-all text-lg tracking-wider"
                >
                  {isBattling ? "BATTLE IN PROGRESS..." : "INITIATE BATTLE"}
                  {!isBattling && <Sword className="w-5 h-5" />}
                </button>
              )}

              {battleResult && (
                <div className="text-center py-6">
                  <div className="text-3xl tracking-tight mb-8">{battleResult}</div>
                  <button onClick={closeBattle} className="text-sm text-white/60 hover:text-white">CLOSE</button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mint Modal */}
      <AnimatePresence>
        {showMintModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-6">
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.98 }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="w-full max-w-lg border border-white/10 rounded-3xl bg-[#0A0A0B] p-12 relative"
            >
              <button onClick={closeMintModal} className="absolute top-8 right-8 text-white/40 hover:text-white text-xl">×</button>

              <div className="text-center mb-10">
                <div className="text-xs tracking-[4px] text-white/40 mb-3">CREATE AGENT</div>
                <div className="text-6xl font-semibold tracking-[-3px]">Mint New Agent</div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3 ml-1">
                    <div className="text-xs tracking-widest text-white/50">AGENT NAME</div>
                    <button onClick={generateRandomName} className="flex items-center gap-1.5 text-xs text-[#C5A26F] hover:text-white transition-all active:scale-95">
                      <Shuffle className="w-3.5 h-3.5" /> RANDOM
                    </button>
                  </div>
                  <input
                    type="text"
                    value={mintName}
                    onChange={(e) => setMintName(e.target.value)}
                    placeholder="Enter agent name"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-7 py-5 text-xl focus:outline-none focus:border-[#C5A26F]/60 placeholder:text-white/30 transition-all"
                  />
                </div>
                <div>
                  <div className="text-xs tracking-widest text-white/50 mb-3 ml-1">X HANDLE <span className="text-[#C5A26F]">*</span></div>
                  <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl focus-within:border-[#C5A26F]/60 transition-all">
                    <span className="text-white/40 pl-7 pr-2">@</span>
                    <input
                      type="text"
                      value={mintX}
                      onChange={(e) => setMintX(e.target.value)}
                      placeholder="username"
                      className="flex-1 bg-transparent px-5 py-5 text-xl focus:outline-none placeholder:text-white/30"
                    />
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="mt-6 text-center text-sm text-red-400 tracking-wide">{errorMsg}</div>
              )}

              <button
                onClick={mintNewAgent}
                disabled={!mintName.trim() || !mintX.trim()}
                className="w-full mt-10 py-5 rounded-2xl bg-white text-black font-medium flex items-center justify-center gap-3 hover:bg-[#C5A26F] disabled:opacity-50 active:scale-[0.985] transition-all text-lg tracking-wider"
              >
                MINT AGENT ON RITUAL
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
