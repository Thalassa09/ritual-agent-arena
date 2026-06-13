'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Sword, Trophy, Users, Zap, LogOut, Plus, ArrowRight, Shuffle, ChevronRight, Activity, Flame, Crown, Shield, Sparkles, X } from 'lucide-react';
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

interface BattleLog {
  id: number;
  attacker: string;
  defender: string;
  winner: string;
  timestamp: number;
}

/* ══════════════════════════════════════════════════════════════════
   ANIMATED BACKGROUND — Luminance Stacking (Linear-inspired)
   ══════════════════════════════════════════════════════════════════ */
const NeuralBackground = () => (
  <div className="fixed inset-0 z-[-1] overflow-hidden" style={{ background: '#030806' }}>
    {/* Mesh gradient layer */}
    <div className="absolute inset-0" style={{
      background: `
        radial-gradient(ellipse 80% 60% at 20% 10%, rgba(16,185,129,0.07) 0%, transparent 60%),
        radial-gradient(ellipse 60% 80% at 80% 90%, rgba(20,184,166,0.05) 0%, transparent 55%),
        radial-gradient(ellipse 50% 50% at 50% 50%, rgba(132,204,22,0.03) 0%, transparent 70%)
      `
    }} />

    {/* Subtle grid — Linear-style */}
    <div className="absolute inset-0" style={{
      backgroundImage: `
        linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(16,185,129,0.03) 1px, transparent 1px)
      `,
      backgroundSize: '80px 80px'
    }} />

    {/* Floating orbs — subtle, not spammy */}
    {[
      { size: 800, x: '10%', y: '-20%', color: 'rgba(16,185,129,0.06)', dur: 55 },
      { size: 600, x: '70%', y: '60%', color: 'rgba(20,184,166,0.04)', dur: 65 },
      { size: 500, x: '40%', y: '30%', color: 'rgba(132,204,22,0.03)', dur: 75 },
    ].map((orb, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{
          width: orb.size,
          height: orb.size,
          left: orb.x,
          top: orb.y,
          background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
          filter: 'blur(60px)',
        }}
        animate={{
          x: [0, 80, -60, 0],
          y: [0, -60, 40, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{ duration: orb.dur, repeat: Infinity, ease: 'easeInOut' }}
      />
    ))}

    {/* Minimal particles — only 12, not 48 */}
    {Array.from({ length: 12 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{
          width: i % 3 === 0 ? 3 : 2,
          height: i % 3 === 0 ? 3 : 2,
          left: `${(i * 8.3 + 5) % 100}%`,
          top: `${(i * 7.1 + 3) % 100}%`,
          backgroundColor: i % 4 === 0 ? '#84CC16' : i % 3 === 0 ? '#34D399' : '#10B981',
        }}
        animate={{
          y: [0, -200, 0],
          opacity: [0, 0.6, 0],
          scale: [0.5, 1.5, 0.5],
        }}
        transition={{
          duration: 16 + (i % 6) * 2,
          repeat: Infinity,
          delay: i * 1.2,
          ease: 'easeInOut',
        }}
      />
    ))}
  </div>
);

/* ══════════════════════════════════════════════════════════════════
   UTILS
   ══════════════════════════════════════════════════════════════════ */
const randomNames = ["Shadow", "Void", "Nexus", "Aether", "Eclipse", "Phantom", "Nova", "Rift", "Specter", "Quantum", "Nebula", "Vortex", "Astral", "Chronos", "Elysium", "Obsidian", "Celestia", "Helix", "Orion", "Zenith", "Lunar", "Solstice"];
const randomSuffixes = ["Oracle", "Weaver", "Striker", "Knight", "Reaper", "Warden", "Sage", "Hunter", "Lord", "Walker"];
const generateRandomAgentName = () => {
  return `${randomNames[Math.floor(Math.random() * randomNames.length)]} ${randomSuffixes[Math.floor(Math.random() * randomSuffixes.length)]}`;
};

const getAgentAvatar = (name: string) => {
  const colors = ['#10B981', '#34D399', '#059669', '#84CC16', '#14B8A6', '#6EE7B7'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const getPowerColor = (power: number) => {
  if (power >= 90) return '#F59E0B';
  if (power >= 80) return '#10B981';
  if (power >= 70) return '#3B82F6';
  return '#8B5CF6';
};

/* ══════════════════════════════════════════════════════════════════
   POWER BAR COMPONENT
   ══════════════════════════════════════════════════════════════════ */
const PowerBar = ({ value, max = 100 }: { value: number; max?: number }) => {
  const pct = (value / max) * 100;
  const color = getPowerColor(value);
  return (
    <div className="relative h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ background: `linear-gradient(90deg, ${color}, ${color}dd)`, boxShadow: `0 0 8px ${color}40` }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
      />
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   ANIMATED COUNTER
   ══════════════════════════════════════════════════════════════════ */
const AnimatedCounter = ({ value, duration = 1.5 }: { value: number; duration?: number }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;
    const increment = end / (duration * 60);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <>{display}</>;
};

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════ */
export default function RitualAgentArena() {
  const [account, setAccount] = useState<string>('');
  const [contract, setContract] = useState<any>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'arena'>('dashboard');

  const [mintedAgents, setMintedAgents] = useState<MintedAgent[]>([
    { id: 1, name: "Shadow Oracle", xHandle: "shadow_ai", wallet: "0x000", power: 83, wins: 12 },
    { id: 2, name: "Void Weaver", xHandle: "void_ops", wallet: "0x001", power: 79, wins: 9 },
    { id: 3, name: "Nexus Striker", xHandle: "nexus_defi", wallet: "0x002", power: 84, wins: 15 },
    { id: 4, name: "Aether Knight", xHandle: "aether_net", wallet: "0x003", power: 76, wins: 8 },
    { id: 5, name: "Eclipse Reaper", xHandle: "eclipse_dao", wallet: "0x004", power: 81, wins: 11 },
  ]);

  const [battleLogs, setBattleLogs] = useState<BattleLog[]>([
    { id: 1, attacker: "Nexus Striker", defender: "Shadow Oracle", winner: "Nexus Striker", timestamp: Date.now() - 120000 },
    { id: 2, attacker: "Eclipse Reaper", defender: "Void Weaver", winner: "Eclipse Reaper", timestamp: Date.now() - 300000 },
    { id: 3, attacker: "Shadow Oracle", defender: "Aether Knight", winner: "Shadow Oracle", timestamp: Date.now() - 480000 },
  ]);

  useEffect(() => {
    const saved = localStorage.getItem("ritual_agents");
    if (saved) { try { setMintedAgents(JSON.parse(saved)); } catch (e) { } }
    const savedLogs = localStorage.getItem("ritual_battle_logs");
    if (savedLogs) { try { setBattleLogs(JSON.parse(savedLogs)); } catch (e) { } }
  }, []);

  useEffect(() => {
    if (mintedAgents.length > 0) localStorage.setItem("ritual_agents", JSON.stringify(mintedAgents));
  }, [mintedAgents]);

  useEffect(() => {
    if (battleLogs.length > 0) localStorage.setItem("ritual_battle_logs", JSON.stringify(battleLogs));
  }, [battleLogs]);

  const [selectedAgent, setSelectedAgent] = useState<MintedAgent | null>(null);
  const [isBattling, setIsBattling] = useState(false);
  const [isBattleAnimating, setIsBattleAnimating] = useState(false);
  const [battleResult, setBattleResult] = useState<{ text: string; type: 'win' | 'lose' | 'draw' } | null>(null);
  const [opponent, setOpponent] = useState<MintedAgent | null>(null);

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

  const disconnectWallet = () => { setAccount(''); setContract(null); };

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
      if (alreadyMinted) { alert("This wallet has already minted an agent. 1 wallet = 1 agent."); return; }
    }
    setShowMintModal(true);
    setMintName(''); setMintX(''); setErrorMsg('');
  };

  const mintNewAgent = async () => {
    if (!contract || !mintName.trim() || !mintX.trim()) return;
    const nameLower = mintName.trim().toLowerCase();
    const xLower = mintX.trim().toLowerCase();
    if (mintedAgents.find(a => a.name.toLowerCase() === nameLower)) { setErrorMsg("Agent name already taken"); return; }
    if (mintedAgents.find(a => a.xHandle.toLowerCase() === xLower)) { setErrorMsg("X handle already taken"); return; }
    try {
      const displayName = `${mintName.trim()} (@${mintX.trim()})`;
      const tx = await contract.mintAgent(displayName);
      await tx.wait();
      const power = Math.floor(Math.random() * 16) + 80;
      const newAgent: MintedAgent = { id: mintedAgents.length + 1, name: mintName.trim(), xHandle: mintX.trim(), wallet: account, power, wins: 0 };
      setMintedAgents([...mintedAgents, newAgent]);
      alert("Agent minted successfully!");
      setShowMintModal(false);
    } catch (err) { console.error(err); alert("Mint failed"); }
  };

  const enterArena = (agent: MintedAgent) => {
    setSelectedAgent(agent);
    setBattleResult(null);
    setOpponent(null);
    setIsBattling(false);
    setActiveView('arena');
  };

  const startBattle = async () => {
    if (!selectedAgent) return;
    setIsBattling(true);
    setIsBattleAnimating(true);
    setBattleResult(null);

    const opponents = mintedAgents.filter(a => a.id !== selectedAgent.id);
    if (opponents.length === 0) {
      setBattleResult({ text: "No opponents available", type: 'draw' });
      setIsBattling(false); setIsBattleAnimating(false);
      return;
    }

    const opp = opponents[Math.floor(Math.random() * opponents.length)];
    setOpponent(opp);

    await new Promise(resolve => setTimeout(resolve, 2800));

    const myPower = selectedAgent.power + Math.random() * 10;
    const oppPower = opp.power + Math.random() * 10;

    let result: { text: string; type: 'win' | 'lose' | 'draw' };
    if (myPower > oppPower) {
      result = { text: `${selectedAgent.name} defeated ${opp.name}!`, type: 'win' };
      setMintedAgents(mintedAgents.map(a => a.id === selectedAgent.id ? { ...a, wins: a.wins + 1 } : a));
    } else if (myPower < oppPower) {
      result = { text: `${opp.name} overpowered ${selectedAgent.name}`, type: 'lose' };
    } else {
      result = { text: `Draw! Equal power`, type: 'draw' };
    }

    setBattleLogs(prev => [{
      id: prev.length + 1,
      attacker: selectedAgent.name,
      defender: opp.name,
      winner: result.type === 'win' ? selectedAgent.name : opp.name,
      timestamp: Date.now()
    }, ...prev].slice(0, 20));

    setBattleResult(result);
    setIsBattleAnimating(false);
    setIsBattling(false);
  };

  const totalAgents = mintedAgents.length;
  const totalWins = mintedAgents.reduce((sum, a) => sum + a.wins, 0);
  const avgPower = totalAgents > 0 ? Math.round(mintedAgents.reduce((sum, a) => sum + a.power, 0) / totalAgents) : 0;
  const leaderboard = [...mintedAgents].sort((a, b) => b.wins - a.wins).slice(0, 5);

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  /* ─────────────── NAVBAR ─────────────── */
  const Navbar = () => (
    <motion.nav
      className="sticky top-0 z-50"
      style={{
        background: 'rgba(3,8,6,0.7)',
        backdropFilter: 'blur(24px) saturate(1.2)',
        borderBottom: '1px solid rgba(16,185,129,0.06)',
      }}
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 30 }}
    >
      <div className="max-w-[1440px] mx-auto px-6 h-14 flex items-center justify-between">
        {/* Left — Logo */}
        <div className="flex items-center gap-3">
          <motion.div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #10B981, #059669)',
              boxShadow: '0 0 20px rgba(16,185,129,0.2)',
            }}
            animate={{ boxShadow: ['0 0 12px rgba(16,185,129,0.15)', '0 0 24px rgba(16,185,129,0.3)', '0 0 12px rgba(16,185,129,0.15)'] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Sword className="w-4 h-4 text-black" />
          </motion.div>
          <div>
            <span className="text-[15px] font-semibold tracking-tight" style={{ color: '#f0f2f0' }}>Ritual</span>
            <span className="text-[10px] font-medium ml-1.5 tracking-[2px]" style={{ color: 'rgba(16,185,129,0.5)' }}>ARENA</span>
          </div>
        </div>

        {/* Center — Nav tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
          {[
            { id: 'dashboard' as const, label: 'Dashboard', icon: Activity },
            { id: 'arena' as const, label: 'Arena', icon: Sword },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className="relative flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                color: activeView === tab.id ? '#f0f2f0' : 'rgba(255,255,255,0.35)',
                background: activeView === tab.id ? 'rgba(16,185,129,0.1)' : 'transparent',
              }}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {activeView === tab.id && (
                <motion.div
                  className="absolute inset-0 rounded-lg"
                  style={{ border: '1px solid rgba(16,185,129,0.15)' }}
                  layoutId="activeTab"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Right — Wallet */}
        <div className="flex items-center gap-3">
          {account ? (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono" style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                {account.slice(0, 6)}...{account.slice(-4)}
              </div>
              <button onClick={disconnectWallet} className="p-2 rounded-lg transition-colors" style={{ color: 'rgba(255,255,255,0.3)' }}>
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <motion.button
              onClick={connectWallet}
              className="flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold text-black"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 0 20px rgba(16,185,129,0.2)' }}
              whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(16,185,129,0.35)' }}
              whileTap={{ scale: 0.98 }}
            >
              Connect <ArrowRight className="w-3 h-3" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.nav>
  );

  /* ─────────────── DASHBOARD VIEW ─────────────── */
  const DashboardView = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-[1440px] mx-auto px-6 py-8"
    >
      {/* Hero — compact, Linear-style */}
      <motion.div
        className="text-center mb-12 pt-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-1 rounded-full text-[10px] font-medium tracking-[3px] mb-6"
          style={{ color: '#34D399', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)' }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          RITUAL TESTNET · CHAIN 1979
        </motion.div>

        <motion.h1
          className="text-[72px] leading-[0.95] font-semibold tracking-[-3px] mb-4"
          style={{ color: '#f0f2f0' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          Where Agents
          <br />
          <span style={{
            background: 'linear-gradient(135deg, #10B981, #34D399, #84CC16)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Prove Their Worth
          </span>
        </motion.h1>

        <motion.p
          className="text-lg max-w-md mx-auto"
          style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '-0.3px' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Mint. Battle. Ascend. On-chain combat on Ritual.
        </motion.p>
      </motion.div>

      {/* Stats Row — Linear-style, ultra-compact */}
      <motion.div
        className="grid grid-cols-4 gap-3 mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {[
          { icon: Users, label: 'Agents', value: totalAgents, color: '#10B981' },
          { icon: Flame, label: 'Total Wins', value: totalWins, color: '#F59E0B' },
          { icon: Zap, label: 'Avg Power', value: avgPower, color: '#3B82F6' },
          { icon: Activity, label: 'Battles', value: battleLogs.length, color: '#8B5CF6' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            className="rounded-xl p-5 group cursor-default"
            style={{
              background: 'rgba(255,255,255,0.015)',
              border: '1px solid rgba(255,255,255,0.04)',
            }}
            whileHover={{
              background: 'rgba(255,255,255,0.03)',
              borderColor: `${stat.color}20`,
              y: -2,
            }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <stat.icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
              <span className="text-[10px] font-medium tracking-[2px] uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {stat.label}
              </span>
            </div>
            <div className="text-4xl font-semibold tracking-[-2px]" style={{ color: '#f0f2f0' }}>
              <AnimatedCounter value={stat.value} />
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Grid: Agents + Activity */}
      <div className="grid grid-cols-[1fr_320px] gap-4">
        {/* Left — Agent Roster */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold tracking-tight" style={{ color: '#f0f2f0' }}>Agent Roster</h2>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ color: 'rgba(16,185,129,0.7)', background: 'rgba(16,185,129,0.08)' }}>
                {totalAgents}
              </span>
            </div>
            <motion.button
              onClick={openMintModal}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-black"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="w-3 h-3" /> Mint Agent
            </motion.button>
          </div>

          {/* Agent Cards — Grid */}
          <div className="grid grid-cols-2 gap-3">
            {mintedAgents.map((agent, i) => (
              <motion.div
                key={agent.id}
                className="rounded-xl p-5 cursor-pointer group relative overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.015)',
                  border: '1px solid rgba(255,255,255,0.04)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                whileHover={{
                  borderColor: 'rgba(16,185,129,0.15)',
                  y: -3,
                }}
                onClick={() => enterArena(agent)}
              >
                {/* Hover glow */}
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: 'radial-gradient(circle at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 70%)' }}
                />

                <div className="relative">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-black"
                        style={{ background: getAgentAvatar(agent.name) }}
                      >
                        {agent.name.split(' ').map(w => w[0]).join('')}
                      </div>
                      <div>
                        <div className="text-sm font-semibold tracking-tight" style={{ color: '#f0f2f0' }}>{agent.name}</div>
                        <div className="text-[11px]" style={{ color: 'rgba(52,211,153,0.6)' }}>@{agent.xHandle}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold tracking-tight" style={{ color: getPowerColor(agent.power) }}>{agent.power}</div>
                      <div className="text-[9px] uppercase tracking-[1px]" style={{ color: 'rgba(255,255,255,0.2)' }}>POWER</div>
                    </div>
                  </div>

                  <PowerBar value={agent.power} />

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1.5">
                      <Trophy className="w-3 h-3" style={{ color: '#F59E0B' }} />
                      <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>{agent.wins} wins</span>
                    </div>
                    <motion.div
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: '#10B981', background: 'rgba(16,185,129,0.08)' }}
                    >
                      Battle <ChevronRight className="w-3 h-3" />
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Top Agents Leaderboard */}
          {leaderboard.length > 0 && (
            <motion.div
              className="mt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="flex items-center gap-2 mb-4 px-1">
                <Crown className="w-4 h-4" style={{ color: '#F59E0B' }} />
                <h2 className="text-lg font-semibold tracking-tight" style={{ color: '#f0f2f0' }}>Leaderboard</h2>
              </div>
              <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)' }}>
                {leaderboard.map((agent, i) => (
                  <motion.div
                    key={agent.id}
                    className="flex items-center gap-4 px-5 py-3.5 group cursor-pointer"
                    style={{ borderBottom: i < leaderboard.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}
                    whileHover={{ background: 'rgba(255,255,255,0.02)' }}
                    onClick={() => enterArena(agent)}
                  >
                    <div className="w-6 text-center">
                      {i === 0 ? <span className="text-sm">👑</span> : (
                        <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>{i + 1}</span>
                      )}
                    </div>
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-black"
                      style={{ background: getAgentAvatar(agent.name) }}
                    >
                      {agent.name.split(' ').map(w => w[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: '#f0f2f0' }}>{agent.name}</div>
                      <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>@{agent.xHandle}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold" style={{ color: '#f0f2f0' }}>{agent.wins}</div>
                      <div className="text-[9px] uppercase tracking-[1px]" style={{ color: 'rgba(255,255,255,0.2)' }}>wins</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Right — Activity Feed */}
        <div>
          <div className="flex items-center gap-2 mb-4 px-1">
            <Activity className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <h2 className="text-sm font-medium tracking-tight" style={{ color: 'rgba(255,255,255,0.5)' }}>Battle Feed</h2>
          </div>
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)' }}
          >
            {battleLogs.length === 0 ? (
              <div className="p-8 text-center">
                <Shield className="w-8 h-8 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>No battles yet</div>
              </div>
            ) : (
              battleLogs.slice(0, 10).map((log, i) => (
                <motion.div
                  key={log.id}
                  className="px-4 py-3"
                  style={{ borderBottom: i < Math.min(battleLogs.length, 10) - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Sword className="w-3 h-3" style={{ color: 'rgba(16,185,129,0.5)' }} />
                    <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>{timeAgo(log.timestamp)}</span>
                  </div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    <span className="font-medium" style={{ color: '#f0f2f0' }}>{log.attacker}</span>
                    {' vs '}
                    <span className="font-medium" style={{ color: '#f0f2f0' }}>{log.defender}</span>
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: log.winner === log.attacker ? '#10B981' : '#F59E0B' }}>
                    {log.winner} won
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );

  /* ─────────────── ARENA VIEW ─────────────── */
  const ArenaView = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-[1440px] mx-auto px-6 py-8"
    >
      {!selectedAgent ? (
        /* Agent Selection */
        <div>
          <div className="text-center mb-10 pt-8">
            <h2 className="text-4xl font-semibold tracking-[-1.5px] mb-2" style={{ color: '#f0f2f0' }}>Choose Your Fighter</h2>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Select an agent to enter the arena</p>
          </div>
          <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto">
            {mintedAgents.map((agent, i) => (
              <motion.div
                key={agent.id}
                className="rounded-xl p-6 cursor-pointer text-center"
                style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)' }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ borderColor: 'rgba(16,185,129,0.2)', y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => enterArena(agent)}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold text-black mx-auto mb-3"
                  style={{ background: getAgentAvatar(agent.name) }}
                >
                  {agent.name.split(' ').map(w => w[0]).join('')}
                </div>
                <div className="text-sm font-semibold mb-1" style={{ color: '#f0f2f0' }}>{agent.name}</div>
                <div className="text-[10px] mb-3" style={{ color: 'rgba(52,211,153,0.5)' }}>@{agent.xHandle}</div>
                <div className="text-2xl font-semibold tracking-tight" style={{ color: getPowerColor(agent.power) }}>{agent.power}</div>
                <div className="text-[9px] uppercase tracking-[1px]" style={{ color: 'rgba(255,255,255,0.2)' }}>POWER</div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        /* Battle Arena */
        <div className="max-w-2xl mx-auto">
          {/* Back button */}
          <button
            onClick={() => { setSelectedAgent(null); setBattleResult(null); setOpponent(null); }}
            className="flex items-center gap-2 text-xs font-medium mb-8 transition-colors"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            ← Back to selection
          </button>

          {/* Battle Card */}
          <motion.div
            className="rounded-2xl overflow-hidden relative"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(16,185,129,0.08)',
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          >
            {/* Battle Header */}
            <div className="p-8 pb-6 text-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="text-[10px] font-medium tracking-[3px] mb-4" style={{ color: 'rgba(16,185,129,0.5)' }}>
                ⚡ ARENA MODE
              </div>

              {/* Fighters */}
              <div className="flex items-center justify-center gap-8">
                {/* You */}
                <motion.div className="text-center" initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-black mx-auto mb-2"
                    style={{ background: getAgentAvatar(selectedAgent.name), boxShadow: `0 0 25px ${getAgentAvatar(selectedAgent.name)}30` }}
                  >
                    {selectedAgent.name.split(' ').map(w => w[0]).join('')}
                  </div>
                  <div className="text-sm font-semibold" style={{ color: '#f0f2f0' }}>{selectedAgent.name}</div>
                  <div className="text-xs mt-1" style={{ color: getPowerColor(selectedAgent.power) }}>Power {selectedAgent.power}</div>
                </motion.div>

                {/* VS */}
                <motion.div
                  className="text-3xl font-bold"
                  style={{ color: '#10B981' }}
                  animate={isBattleAnimating ? {
                    scale: [1, 1.4, 1],
                    rotate: [0, 10, -10, 0],
                    textShadow: ['0 0 0px rgba(16,185,129,0)', '0 0 20px rgba(16,185,129,0.5)', '0 0 0px rgba(16,185,129,0)'],
                  } : {}}
                  transition={{ duration: 0.6, repeat: isBattleAnimating ? Infinity : 0 }}
                >
                  VS
                </motion.div>

                {/* Opponent */}
                <motion.div className="text-center" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                  {opponent ? (
                    <>
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-black mx-auto mb-2"
                        style={{ background: getAgentAvatar(opponent.name), boxShadow: `0 0 25px ${getAgentAvatar(opponent.name)}30` }}
                      >
                        {opponent.name.split(' ').map(w => w[0]).join('')}
                      </div>
                      <div className="text-sm font-semibold" style={{ color: '#f0f2f0' }}>{opponent.name}</div>
                      <div className="text-xs mt-1" style={{ color: getPowerColor(opponent.power) }}>Power {opponent.power}</div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.08)' }}>
                        <span className="text-2xl">?</span>
                      </div>
                      <div className="text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>???</div>
                    </>
                  )}
                </motion.div>
              </div>
            </div>

            {/* Battle Content */}
            <div className="p-8">
              {isBattleAnimating && (
                <motion.div
                  className="text-center py-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div
                    className="text-xs tracking-[3px] font-medium"
                    style={{ color: 'rgba(16,185,129,0.6)' }}
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    BATTLE IN PROGRESS
                  </motion.div>
                  <div className="flex justify-center gap-1 mt-3">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-[#10B981]"
                        animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {!battleResult && !isBattleAnimating && (
                <motion.button
                  onClick={startBattle}
                  disabled={isBattling}
                  className="w-full py-4 rounded-xl text-sm font-bold text-black flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    boxShadow: '0 0 30px rgba(16,185,129,0.2)',
                  }}
                  whileHover={{ scale: 1.01, boxShadow: '0 0 40px rgba(16,185,129,0.35)' }}
                  whileTap={{ scale: 0.99 }}
                >
                  INITIATE BATTLE <Sword className="w-4 h-4" />
                </motion.button>
              )}

              {battleResult && (
                <motion.div
                  className="text-center py-4"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                >
                  <div className="text-4xl mb-3">
                    {battleResult.type === 'win' ? '⚡' : battleResult.type === 'lose' ? '💀' : '🤝'}
                  </div>
                  <div className="text-xl font-semibold mb-2" style={{
                    color: battleResult.type === 'win' ? '#10B981' : battleResult.type === 'lose' ? '#EF4444' : '#F59E0B'
                  }}>
                    {battleResult.type === 'win' ? 'VICTORY' : battleResult.type === 'lose' ? 'DEFEAT' : 'DRAW'}
                  </div>
                  <div className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>{battleResult.text}</div>

                  <div className="flex gap-3 justify-center">
                    <motion.button
                      onClick={startBattle}
                      className="px-6 py-2.5 rounded-xl text-xs font-bold text-black"
                      style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      FIGHT AGAIN
                    </motion.button>
                    <button
                      onClick={() => { setSelectedAgent(null); setBattleResult(null); setOpponent(null); }}
                      className="px-6 py-2.5 rounded-xl text-xs font-medium transition-colors"
                      style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      CHANGE AGENT
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );

  /* ─────────────── MINT MODAL ─────────────── */
  const MintModal = () => (
    <AnimatePresence>
      {showMintModal && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-md rounded-2xl relative overflow-hidden"
            style={{
              background: '#0a1210',
              border: '1px solid rgba(16,185,129,0.1)',
              boxShadow: '0 0 80px rgba(16,185,129,0.08)',
            }}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 250, damping: 25 }}
          >
            {/* Close */}
            <button
              onClick={() => setShowMintModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-lg transition-colors"
              style={{ color: 'rgba(255,255,255,0.25)' }}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-8">
              <div className="text-center mb-8">
                <div className="text-[10px] font-medium tracking-[3px] mb-3" style={{ color: 'rgba(16,185,129,0.5)' }}>
                  RITUAL TESTNET · CHAIN 1979
                </div>
                <h3 className="text-3xl font-semibold tracking-[-1.5px]" style={{ color: '#f0f2f0' }}>Mint Agent</h3>
                <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Deploy your on-chain warrior</p>
              </div>

              <div className="space-y-5">
                {/* Agent Name */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-medium tracking-[2px] uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Agent Name
                    </label>
                    <button
                      onClick={() => { setMintName(generateRandomAgentName()); setErrorMsg(''); }}
                      className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-md transition-colors"
                      style={{ color: '#34D399' }}
                    >
                      <Shuffle className="w-3 h-3" /> Random
                    </button>
                  </div>
                  <input
                    type="text"
                    value={mintName}
                    onChange={(e) => setMintName(e.target.value)}
                    placeholder="Enter agent name"
                    className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: '#f0f2f0',
                    }}
                  />
                </div>

                {/* X Handle */}
                <div>
                  <label className="text-[10px] font-medium tracking-[2px] uppercase mb-2 flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    X Handle <span style={{ color: '#10B981' }}>*</span>
                  </label>
                  <div
                    className="flex items-center rounded-xl transition-all"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <span className="pl-4 text-sm" style={{ color: 'rgba(52,211,153,0.4)' }}>@</span>
                    <input
                      type="text"
                      value={mintX}
                      onChange={(e) => setMintX(e.target.value)}
                      placeholder="username"
                      className="flex-1 px-3 py-3 text-sm bg-transparent focus:outline-none"
                      style={{ color: '#f0f2f0' }}
                    />
                  </div>
                </div>
              </div>

              {errorMsg && (
                <motion.div
                  className="mt-4 px-4 py-2.5 rounded-xl text-xs text-center"
                  style={{ color: '#F87171', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.1)' }}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {errorMsg}
                </motion.div>
              )}

              <motion.button
                onClick={mintNewAgent}
                disabled={!mintName.trim() || !mintX.trim()}
                className="w-full mt-6 py-3.5 rounded-xl text-sm font-bold text-black flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 0 20px rgba(16,185,129,0.15)' }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                MINT ON RITUAL <Sparkles className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  /* ─────────────── RENDER ─────────────── */
  return (
    <div className="min-h-screen" style={{ color: '#f0f2f0' }}>
      <NeuralBackground />
      <Navbar />

      <AnimatePresence mode="wait">
        {activeView === 'dashboard' ? <DashboardView key="dashboard" /> : <ArenaView key="arena" />}
      </AnimatePresence>

      <MintModal />
    </div>
  );
}
