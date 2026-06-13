'use client';

import { useState, useEffect } from 'react';
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

/* ─────────────── RITUAL GREEN CINEMATIC BACKGROUND ─────────────── */
const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#060D09]">
      {/* Base micro-grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#0E1F16_0.6px,transparent_1px)] bg-[length:4px_4px] opacity-55" />

      {/* ── Glowing Orbs (emerald + teal + lime) ── */}
      <motion.div
        className="absolute -top-[52%] -left-[28%] w-[1650px] h-[1650px] rounded-full"
        style={{ background: 'radial-gradient(circle at 38% 32%, rgba(16,185,129,0.15) 0%, transparent 68%)' }}
        animate={{ x: [0, 200, -100, 0], y: [0, 120, -80, 0], scale: [1, 1.16, 0.95, 1], rotate: [0, 7, -4, 0] }}
        transition={{ duration: 60, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-[46%] -right-[20%] w-[1450px] h-[1450px] rounded-full"
        style={{ background: 'radial-gradient(circle at 62% 62%, rgba(20,184,166,0.10) 0%, transparent 72%)' }}
        animate={{ x: [0, -180, 95, 0], y: [0, -110, 65, 0], scale: [1, 1.13, 0.96, 1], rotate: [0, -6, 3, 0] }}
        transition={{ duration: 66, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-[16%] left-[34%] w-[920px] h-[920px] rounded-full"
        style={{ background: 'radial-gradient(circle at 48% 44%, rgba(132,204,22,0.05) 0%, transparent 76%)' }}
        animate={{ x: [0, 80, -50, 0], y: [0, -60, 40, 0], scale: [1, 1.20, 0.92, 1] }}
        transition={{ duration: 72, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* ── Horizontal Light Beams (emerald) ── */}
      {Array.from({ length: 11 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-px bg-gradient-to-r from-transparent via-[#10B981] to-transparent"
          style={{
            left: `${3 + i * 9}%`,
            top: `${8 + i * 8.5}%`,
            width: `${400 + i * 45}px`,
            opacity: 0.08 + (i % 3) * 0.05,
          }}
          animate={{ x: [0, 300, -120, 0], opacity: [0.06, 0.35, 0.06] }}
          transition={{ duration: 30 + i * 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* ── Floating Particles (emerald + lime mix) ── */}
      {Array.from({ length: 48 }).map((_, i) => {
        const colors = ['#10B981', '#34D399', '#6EE7B7', '#84CC16'];
        const color = colors[i % colors.length];
        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              backgroundColor: color,
              left: `${(i * 5.2 + 3) % 100}%`,
              top: `${(i * 7.8 + 4) % 100}%`,
              width: i % 4 === 0 ? '3.5px' : i % 3 === 0 ? '2.5px' : '1.5px',
              height: i % 4 === 0 ? '3.5px' : i % 3 === 0 ? '2.5px' : '1.5px',
            }}
            animate={{
              y: [0, -300, 0],
              x: [0, (i % 5 === 0 ? 70 : -52), 0],
              opacity: [0, 0.80, 0],
              scale: [0.35, 2.2, 0.35],
            }}
            transition={{ duration: 18 + (i % 8) * 1.7, repeat: Infinity, delay: i * 0.19, ease: "easeInOut" }}
          />
        );
      })}

      {/* ── Vertical Light Lines ── */}
      {Array.from({ length: 13 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-px"
          style={{
            left: `${7 + i * 7.2}%`,
            top: `${5 + (i % 4) * 10}%`,
            height: `${200 + (i % 5) * 50}px`,
            background: i % 3 === 0 ? '#10B981' : '#ffffff',
            opacity: 0.06 + (i % 4) * 0.03,
          }}
          animate={{ y: [0, 150, 0], opacity: [0.04, 0.22, 0.04] }}
          transition={{ duration: 23 + (i % 6) * 2.3, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Depth grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0B1A13_1px,transparent_1px)] bg-[length:175px_175px] opacity-32" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#0B1A13_1px,transparent_1px)] bg-[length:175px_175px] opacity-32" />
    </div>
  );
};

/* ─────────────── UTILS ─────────────── */
const randomNames = ["Shadow", "Void", "Nexus", "Aether", "Eclipse", "Phantom", "Nova", "Rift", "Specter", "Quantum", "Nebula", "Vortex", "Astral", "Chronos", "Elysium", "Obsidian", "Celestia", "Helix", "Orion", "Zenith", "Lunar", "Solstice"];
const randomSuffixes = ["Oracle", "Weaver", "Striker", "Knight", "Reaper", "Warden", "Sage", "Hunter", "Lord", "Walker"];

const generateRandomAgentName = () => {
  const name = randomNames[Math.floor(Math.random() * randomNames.length)];
  const suffix = randomSuffixes[Math.floor(Math.random() * randomSuffixes.length)];
  return `${name} ${suffix}`;
};

/* ─────────────── MAIN COMPONENT ─────────────── */
export default function RitualAgentArena() {
  const [account, setAccount] = useState<string>('');
  const [contract, setContract] = useState<any>(null);

  const [mintedAgents, setMintedAgents] = useState<MintedAgent[]>([
    { id: 1, name: "Shadow Oracle", xHandle: "", wallet: "0x000", power: 83, wins: 12 },
    { id: 2, name: "Void Weaver", xHandle: "", wallet: "0x000", power: 79, wins: 9 },
    { id: 3, name: "Nexus Striker", xHandle: "", wallet: "0x000", power: 84, wins: 15 },
    { id: 4, name: "Aether Knight", xHandle: "", wallet: "0x000", power: 76, wins: 8 },
    { id: 5, name: "Eclipse Reaper", xHandle: "", wallet: "0x000", power: 81, wins: 11 },
  ]);

  // Persistence with localStorage
  useEffect(() => {
    const saved = localStorage.getItem("ritual_agents");
    if (saved) { try { setMintedAgents(JSON.parse(saved)); } catch(e) {} }
  }, []);

  useEffect(() => {
    if (mintedAgents.length > 0) {
      localStorage.setItem("ritual_agents", JSON.stringify(mintedAgents));
    }
  }, [mintedAgents]);

  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [isBattling, setIsBattling] = useState(false);
  const [isBattleAnimating, setIsBattleAnimating] = useState(false);
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

      const power = Math.floor(Math.random() * 16) + 80;

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
    setIsBattleAnimating(true);
    setBattleResult('');

    await new Promise(resolve => setTimeout(resolve, 2200));

    try {
      const opponents = mintedAgents.filter(a => a.id !== selectedAgent.id);
      if (opponents.length === 0) {
        setBattleResult("No other agents to battle");
        setIsBattling(false);
        setIsBattleAnimating(false);
        return;
      }

      const opponent = opponents[Math.floor(Math.random() * opponents.length)];
      const myPower = selectedAgent.power;
      const oppPower = opponent.power;

      let resultText = "";

      if (myPower > oppPower) {
        resultText = `⚡ Victory! ${selectedAgent.name} defeated ${opponent.name} (${myPower} vs ${oppPower})`;
        const updated = mintedAgents.map(a =>
          a.id === selectedAgent.id ? { ...a, wins: a.wins + 1 } : a
        );
        setMintedAgents(updated);
      } else if (myPower < oppPower) {
        resultText = `💀 Defeat. ${opponent.name} overpowered ${selectedAgent.name} (${oppPower} vs ${myPower})`;
      } else {
        resultText = `🤝 Draw! Both agents have equal power (${myPower})`;
      }

      setBattleResult(resultText);
    } catch (err) {
      console.error(err);
      setBattleResult("Battle failed on-chain");
    }

    setIsBattleAnimating(false);
    setIsBattling(false);
  };

  const closeBattle = () => {
    setSelectedAgent(null);
    setBattleResult('');
    setIsBattling(false);
    setIsBattleAnimating(false);
  };

  const totalAgents = mintedAgents.length;
  const totalBattles = 0;
  const avgRating = totalAgents > 0 ? 1700 : 0;
  const leaderboard = [...mintedAgents].sort((a, b) => b.wins - a.wins).slice(0, 5);

  return (
    <div className="min-h-screen text-white relative">
      <AnimatedBackground />

      {/* ─────── NAVBAR ─────── */}
      <div className="border-b border-[#10B981]/10 bg-[#060D09]/80 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-7 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div
              className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#10B981] via-[#059669] to-[#047857] flex items-center justify-center shadow-lg shadow-[#10B981]/20"
              animate={{ boxShadow: ['0 0 15px rgba(16,185,129,0.2)', '0 0 30px rgba(16,185,129,0.35)', '0 0 15px rgba(16,185,129,0.2)'] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sword className="w-5 h-5 text-black" />
            </motion.div>
            <div>
              <div className="font-semibold tracking-[-1px] text-2xl">Ritual</div>
              <div className="text-[10px] text-[#10B981]/60 -mt-1 tracking-[3px]">AGENT ARENA</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {account ? (
              <div className="flex items-center gap-3">
                <div className="px-5 py-2.5 rounded-full bg-[#10B981]/5 text-sm font-mono border border-[#10B981]/15">
                  {account.slice(0,6)}...{account.slice(-4)}
                </div>
                <button onClick={disconnectWallet} className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/20 hover:bg-[#10B981]/10 transition-all active:scale-[0.985]">
                  <LogOut className="w-4 h-4" /> Disconnect
                </button>
              </div>
            ) : (
              <button onClick={connectWallet} className="flex items-center gap-3 px-8 py-3 rounded-full bg-[#10B981] text-black font-bold hover:bg-[#34D399] active:scale-[0.985] transition-all text-sm tracking-wide shadow-lg shadow-[#10B981]/25">
                CONNECT WALLET <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─────── HERO ─────── */}
      <div className="max-w-7xl mx-auto px-8 pt-20 pb-24">
        <div className="text-center mb-24">
          <motion.div
            className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full border border-[#10B981]/15 bg-[#10B981]/5 text-xs tracking-[4px] text-[#34D399] mb-8"
            animate={{ borderColor: ['rgba(16,185,129,0.15)', 'rgba(16,185,129,0.3)', 'rgba(16,185,129,0.15)'] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            RITUAL TESTNET • CHAIN 1979
          </motion.div>

          <h1 className="text-[92px] leading-[82px] font-semibold tracking-[-6.5px] mb-6">
            Where Agents<br />
            <span className="bg-gradient-to-r from-[#10B981] via-[#34D399] to-[#84CC16] bg-clip-text text-transparent">Prove Their Worth</span>
          </h1>

          {/* Accent line */}
          <motion.div
            className="mx-auto w-24 h-[2px] rounded-full bg-gradient-to-r from-transparent via-[#10B981] to-transparent mb-6"
            animate={{ width: [80, 120, 80], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 3, repeat: Infinity }}
          />

          <p className="text-2xl text-white/50 max-w-lg mx-auto tracking-[-0.5px]">
            ⚡ Mint. Battle. Ascend.<br />On-chain combat on Ritual.
          </p>
        </div>

        {/* ─────── STATS ─────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-20">
          {[
            { icon: Users, label: "Active Agents", value: totalAgents },
            { icon: Trophy, label: "Battles Fought", value: totalBattles },
            { icon: Zap, label: "Avg Rating", value: avgRating || "—" },
          ].map((stat, i) => (
            <div key={i} className="border border-[#10B981]/10 rounded-3xl p-10 bg-[#10B981]/[0.02] hover:bg-[#10B981]/[0.05] hover:border-[#10B981]/25 transition-all group hover:shadow-[0_0_40px_rgba(16,185,129,0.06)]">
              <stat.icon className="w-5 h-5 text-[#10B981] mb-9 group-hover:scale-110 transition-transform" />
              <div className="text-7xl font-semibold tracking-[-4px] mb-1">{stat.value}</div>
              <div className="text-white/40 text-sm tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ─────── TOP AGENTS ─────── */}
        {leaderboard.length > 0 && (
          <div className="mb-20">
            <div className="flex items-center gap-4 mb-8 px-2">
              <Trophy className="w-6 h-6 text-[#10B981]" />
              <div className="text-5xl font-semibold tracking-[-2.5px]">Top Agents</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {leaderboard.map((agent, index) => (
                <motion.div
                  key={index}
                  className={`rounded-3xl p-8 transition-all ${
                    index === 0
                      ? 'border-2 border-[#10B981]/40 bg-gradient-to-b from-[#10B981]/[0.06] to-transparent shadow-[0_0_30px_rgba(16,185,129,0.08)]'
                      : 'border border-white/10 bg-white/[0.015] hover:border-[#10B981]/30'
                  }`}
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-white/40 tracking-widest">#{index + 1}</span>
                    {index === 0 && <span className="text-xs">👑</span>}
                  </div>
                  <div className="font-semibold text-2xl tracking-[-1px] mb-1 leading-tight">{agent.name}</div>
                  <div className="text-[#34D399] text-sm mb-6">@{agent.xHandle}</div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-white/50 text-sm">Wins</span>
                    <span className="font-semibold text-5xl tracking-[-2px]">{agent.wins}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ─────── MINTED AGENTS TABLE ─────── */}
        {mintedAgents.length > 0 && (
          <div className="mb-20">
            <div className="flex items-center justify-between mb-8 px-2">
              <div className="text-5xl font-semibold tracking-[-2.5px]">Minted Agents</div>
            </div>
            <div className="border border-[#10B981]/10 rounded-3xl overflow-hidden bg-[#10B981]/[0.015]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#10B981]/10 bg-[#10B981]/[0.03]">
                    <th className="text-left px-8 py-6 text-xs tracking-[2.5px] text-white/40 font-normal">#</th>
                    <th className="text-left px-8 py-6 text-xs tracking-[2.5px] text-white/40 font-normal">AGENT</th>
                    <th className="text-left px-8 py-6 text-xs tracking-[2.5px] text-white/40 font-normal">X HANDLE</th>
                    <th className="text-center px-8 py-6 text-xs tracking-[2.5px] text-white/40 font-normal">POWER</th>
                    <th className="text-center px-8 py-6 text-xs tracking-[2.5px] text-white/40 font-normal">WINS</th>
                  </tr>
                </thead>
                <tbody>
                  {mintedAgents.map((agent, index) => (
                    <tr
                      key={index}
                      className="border-b border-[#10B981]/5 last:border-0 hover:bg-[#10B981]/[0.04] transition-all cursor-pointer"
                      onClick={() => enterArena(agent)}
                    >
                      <td className="px-8 py-7 text-white/30 font-mono text-sm">{agent.id}</td>
                      <td className="px-8 py-6 font-medium text-lg tracking-[-0.5px]">{agent.name}</td>
                      <td className="px-8 py-6 text-[#34D399]">@{agent.xHandle}</td>
                      <td className="px-8 py-6 text-center">
                        <span className="inline-flex items-center gap-1 font-mono text-lg">
                          {agent.power}
                          <span className="text-xs text-[#10B981]">⚡</span>
                        </span>
                      </td>
                      <td className="px-8 py-6 text-center font-semibold text-xl tracking-tight">{agent.wins}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─────── AGENT ROSTER ─────── */}
        <div className="flex items-center justify-between mb-8 px-2">
          <div>
            <div className="text-5xl font-semibold tracking-[-2.5px]">Agent Roster</div>
            <div className="text-white/40 mt-1">Choose your champion 🎯</div>
          </div>
          <button onClick={openMintModal} className="flex items-center gap-3 px-8 py-3.5 rounded-full border border-[#10B981]/25 hover:bg-[#10B981]/10 hover:border-[#10B981]/40 active:scale-[0.985] transition-all text-sm tracking-wider text-[#34D399]">
            <Plus className="w-4 h-4" /> MINT NEW AGENT
          </button>
        </div>

        {mintedAgents.length === 0 && (
          <div className="border border-[#10B981]/10 rounded-3xl p-20 text-center bg-[#10B981]/[0.02]">
            <div className="mx-auto w-20 h-20 rounded-3xl bg-[#10B981]/5 flex items-center justify-center mb-8">
              <Users className="w-9 h-9 text-[#10B981]/50" />
            </div>
            <div className="text-4xl font-semibold tracking-[-1.5px] mb-3">No agents yet</div>
            <div className="text-white/40 text-lg mb-10">Be the first to mint an agent on Ritual 🚀</div>
            <button onClick={openMintModal} className="px-10 py-4 rounded-full bg-[#10B981] text-black font-bold hover:bg-[#34D399] active:scale-[0.985] transition-all text-sm tracking-wider shadow-lg shadow-[#10B981]/25">
              MINT YOUR FIRST AGENT
            </button>
          </div>
        )}
      </div>

      {/* ─────── BATTLE MODAL ─────── */}
      <AnimatePresence>
        {selectedAgent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-6">
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.98 }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="w-full max-w-lg border border-[#10B981]/15 rounded-3xl bg-[#070C0A] p-12 relative"
            >
              <button onClick={closeBattle} className="absolute top-8 right-8 text-white/30 hover:text-white text-xl transition-colors">×</button>

              <div className="text-center">
                <div className="text-xs tracking-[4px] text-[#10B981]/60 mb-3">⚡ ARENA MODE</div>
                <div className="text-7xl font-semibold tracking-[-4px] mb-3">{selectedAgent.name}</div>
                <div className="text-[#10B981] text-xl mb-12 font-medium">Power {selectedAgent.power}</div>
              </div>

              {isBattleAnimating && (
                <div className="flex flex-col items-center justify-center py-8">
                  <motion.div
                    className="flex items-center gap-8 mb-6"
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  >
                    <div className="text-center">
                      <div className="text-2xl font-semibold tracking-tight mb-1">{selectedAgent.name}</div>
                      <div className="text-sm text-[#34D399]">Power {selectedAgent.power}</div>
                    </div>
                    <motion.div
                      className="text-4xl text-[#10B981] font-bold"
                      animate={{ scale: [1, 1.3, 1], rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity }}
                    >
                      ⚔️
                    </motion.div>
                    <div className="text-center">
                      <div className="text-2xl font-semibold tracking-tight mb-1">Opponent</div>
                      <div className="text-sm text-white/50">Calculating...</div>
                    </div>
                  </motion.div>
                  <motion.div
                    className="text-sm text-[#10B981]/80 tracking-widest"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    BATTLE IN PROGRESS...
                  </motion.div>
                </div>
              )}

              {!battleResult && !isBattleAnimating && (
                <motion.button
                  onClick={startBattle}
                  disabled={isBattling}
                  className="w-full py-5 rounded-2xl bg-[#10B981] text-black font-bold flex items-center justify-center gap-3 hover:bg-[#34D399] disabled:opacity-60 active:scale-[0.985] transition-all text-lg tracking-wider shadow-lg shadow-[#10B981]/25"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  INITIATE BATTLE ⚡
                  <Sword className="w-5 h-5" />
                </motion.button>
              )}

              {battleResult && (
                <div className="text-center py-6">
                  <div className="text-3xl tracking-tight mb-8">{battleResult}</div>
                  <button onClick={closeBattle} className="text-sm text-[#34D399] hover:text-white transition-colors">CLOSE</button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────── MINT MODAL ─────── */}
      <AnimatePresence>
        {showMintModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-6">
            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.96 }}
              transition={{ type: "spring", damping: 26, stiffness: 240 }}
              className="w-full max-w-[480px] border border-[#10B981]/15 rounded-3xl bg-[#070C0A] p-14 relative shadow-2xl shadow-[#10B981]/5"
            >
              <button
                onClick={closeMintModal}
                className="absolute top-9 right-9 text-white/30 hover:text-white/70 text-3xl transition-colors"
              >
                ×
              </button>

              <div className="text-center mb-12">
                <div className="text-[10px] tracking-[5px] text-[#10B981]/60 mb-4 font-medium">RITUAL TESTNET • CHAIN 1979</div>
                <div className="text-7xl font-semibold tracking-[-4.5px] leading-none">Mint New Agent</div>
                <div className="text-white/40 mt-4 text-[15px] tracking-wide">Create your on-chain warrior 🗡️</div>
              </div>

              <div className="space-y-7">
                {/* Agent Name */}
                <div>
                  <div className="flex items-center justify-between mb-3.5 ml-1">
                    <div className="text-xs tracking-[3px] text-white/50 font-medium">AGENT NAME</div>
                    <button
                      onClick={generateRandomName}
                      className="flex items-center gap-2 text-xs text-[#34D399] hover:text-[#10B981] transition-all active:scale-95 px-3 py-1 rounded-lg hover:bg-[#10B981]/5"
                    >
                      <Shuffle className="w-3.5 h-3.5" /> GENERATE RANDOM
                    </button>
                  </div>
                  <input
                    type="text"
                    value={mintName}
                    onChange={(e) => setMintName(e.target.value)}
                    placeholder="Enter agent name"
                    className="w-full bg-[#10B981]/[0.04] border border-[#10B981]/10 rounded-2xl px-8 py-6 text-2xl focus:outline-none focus:border-[#10B981]/40 placeholder:text-white/20 transition-all tracking-[-0.5px]"
                  />
                </div>

                {/* X Handle */}
                <div>
                  <div className="text-xs tracking-[3px] text-white/50 mb-3.5 ml-1 flex items-center gap-2">
                    X HANDLE <span className="text-[#10B981]">*</span>
                    <span className="text-[10px] text-white/30 font-normal tracking-normal">(required)</span>
                  </div>
                  <div className="flex items-center bg-[#10B981]/[0.04] border border-[#10B981]/10 rounded-2xl focus-within:border-[#10B981]/40 transition-all group">
                    <span className="text-[#34D399]/50 pl-8 pr-1 text-xl">@</span>
                    <input
                      type="text"
                      value={mintX}
                      onChange={(e) => setMintX(e.target.value)}
                      placeholder="username"
                      className="flex-1 bg-transparent px-4 py-6 text-2xl focus:outline-none placeholder:text-white/20 tracking-[-0.3px]"
                    />
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="mt-7 text-center text-sm text-red-400 tracking-wide bg-red-950/30 py-3 rounded-2xl border border-red-900/40">
                  {errorMsg}
                </div>
              )}

              <motion.button
                onClick={mintNewAgent}
                disabled={!mintName.trim() || !mintX.trim()}
                className="w-full mt-10 py-6 rounded-2xl bg-[#10B981] text-black font-bold flex items-center justify-center gap-3 hover:bg-[#34D399] disabled:opacity-30 active:scale-[0.985] transition-all text-lg tracking-[1.5px] disabled:cursor-not-allowed shadow-lg shadow-[#10B981]/20"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                MINT AGENT ON RITUAL ⚡
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
