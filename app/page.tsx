'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sword, Trophy, Users, Zap, LogOut, Plus, ArrowRight } from 'lucide-react';
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

interface Agent {
  id: number;
  name: string;
  wins: number;
  rating: number;
}

export default function RitualAgentArena() {
  const [account, setAccount] = useState<string>('');
  const [contract, setContract] = useState<any>(null);
  const [agents, setAgents] = useState<Agent[]>([
    { id: 1, name: "Shadow Oracle", wins: 12, rating: 1840 },
    { id: 2, name: "Void Weaver", wins: 9, rating: 1720 },
    { id: 3, name: "Nexus Striker", wins: 15, rating: 1910 },
    { id: 4, name: "Aether Knight", wins: 8, rating: 1650 },
  ]);
  
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isBattling, setIsBattling] = useState(false);
  const [battleResult, setBattleResult] = useState<string>('');

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

  const mintNewAgent = async () => {
    if (!contract) return alert("Connect wallet first");
    const name = prompt("Agent name:");
    if (!name) return;
    try {
      const tx = await contract.mintAgent(name);
      await tx.wait();
      alert("Agent minted successfully!");
    } catch (err) {
      console.error(err);
    }
  };

  const enterArena = (agent: Agent) => {
    setSelectedAgent(agent);
    setBattleResult('');
    setIsBattling(false);
  };

  const startBattle = async () => {
    if (!selectedAgent || !contract) return;
    setIsBattling(true);
    try {
      const opponentId = selectedAgent.id === 1 ? 2 : 1;
      const tx = await contract.battle(selectedAgent.id, opponentId);
      await tx.wait();
      setBattleResult(`VICTORY — ${selectedAgent.name} dominated the arena`);
    } catch (err) {
      setBattleResult("The arena rejected your challenge");
    }
    setIsBattling(false);
  };

  const closeModal = () => {
    setSelectedAgent(null);
    setBattleResult('');
    setIsBattling(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      {/* Background */}
      <div className="fixed inset-0 bg-[radial-gradient(#1F1F23_0.5px,transparent_1px)] bg-[length:3px_3px] opacity-60" />
      <div className="fixed inset-0 bg-gradient-to-b from-black via-[#0A0A0B] to-black" />

      {/* Header */}
      <header className="relative z-50 border-b border-white/10 bg-[#0A0A0B]/90 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#C5A26F] via-[#B38B5E] to-[#8B5E3C] flex items-center justify-center">
              <Sword className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="font-semibold text-2xl tracking-[-2px]">RITUAL</div>
              <div className="text-[10px] text-[#C5A26F] -mt-1 tracking-[2px]">AGENT ARENA</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {account && (
              <>
                <button onClick={mintNewAgent} className="flex items-center gap-2 px-6 py-2.5 rounded-2xl border border-white/20 hover:bg-white/5 active:scale-[0.985] transition-all">
                  <Plus className="w-4 h-4" /> Mint Agent
                </button>
                <button onClick={disconnectWallet} className="flex items-center gap-2 px-6 py-2.5 rounded-2xl border border-red-500/30 text-red-400 hover:bg-red-500/10 active:scale-[0.985] transition-all">
                  <LogOut className="w-4 h-4" /> Disconnect
                </button>
              </>
            )}
            <button onClick={connectWallet} className="px-8 py-2.5 rounded-2xl bg-white text-black font-medium hover:bg-[#C5A26F] active:scale-[0.985] transition-all">
              {account ? `${account.slice(0,6)}...${account.slice(-4)}` : 'Connect Wallet'}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-24">
        {/* Hero */}
        <div className="text-center mb-20">
          <div className="inline-block px-5 py-1.5 rounded-full border border-white/10 text-xs tracking-[4px] mb-8 text-[#C5A26F]">
            RITUAL TESTNET • CHAIN 1979
          </div>
          <h1 className="text-[92px] font-semibold tracking-[-7.5px] leading-none mb-6">The Arena<br />Awaits</h1>
          <p className="text-2xl text-white/50">Deploy. Battle. Dominate.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-20">
          {[
            { icon: Users, label: "ACTIVE AGENTS", value: "1,284" },
            { icon: Sword, label: "BATTLES TODAY", value: "8,492" },
            { icon: Trophy, label: "TOTAL REWARDS", value: "142.8K" },
          ].map((stat, index) => (
            <motion.div 
              key={index}
              whileHover={{ y: -2 }}
              className="border border-white/10 rounded-3xl p-9 group hover:border-[#C5A26F]/30 transition-all"
            >
              <stat.icon className="w-5 h-5 text-[#C5A26F] mb-10" />
              <div className="text-6xl font-semibold tracking-[-3px] mb-2">{stat.value}</div>
              <div className="text-sm tracking-[2px] text-white/50">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Agents Grid */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-[#C5A26F] text-sm tracking-[3px]">THE ARENA</div>
            <div className="text-5xl font-semibold tracking-[-2px]">Top Agents</div>
          </div>
          <button className="flex items-center gap-2 text-sm text-white/60 hover:text-white group">
            View all <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {agents.map((agent, index) => (
            <motion.div
              key={agent.id}
              whileHover={{ y: -6 }}
              onClick={() => enterArena(agent)}
              className="group cursor-pointer border border-white/10 rounded-3xl p-9 hover:border-[#C5A26F]/50 active:scale-[0.985] transition-all"
            >
              <div className="flex justify-between mb-10">
                <div className="text-[72px] font-semibold tracking-[-6px] text-white/10 group-hover:text-[#C5A26F]/30 transition-colors">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div className="text-right">
                  <div className="text-xs tracking-[2px] text-white/40">RATING</div>
                  <div className="text-4xl font-semibold tracking-tighter">{agent.rating}</div>
                </div>
              </div>
              <div className="text-3xl font-semibold tracking-[-1.5px] mb-4">{agent.name}</div>
              <div className="flex justify-between text-sm">
                <div className="text-[#C5A26F]">{agent.wins} WINS</div>
                <div className="text-white/30 group-hover:text-white/60 transition">→</div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Battle Modal */}
      <AnimatePresence>
        {selectedAgent && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 30 }}
              transition={{ type: "spring", bounce: 0.1, duration: 0.4 }}
              className="bg-[#111113] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden"
            >
              <div className="p-12">
                <div className="flex justify-between mb-12">
                  <div>
                    <div className="text-[#C5A26F] text-xs tracking-[4px]">RITUAL ARENA</div>
                    <div className="text-5xl font-semibold tracking-[-2px] mt-2">{selectedAgent.name}</div>
                  </div>
                  <button onClick={closeModal} className="text-4xl text-white/30 hover:text-white">×</button>
                </div>

                {!battleResult && !isBattling && (
                  <button onClick={startBattle} className="w-full py-7 rounded-2xl bg-white text-black text-xl font-medium active:scale-[0.985] transition-all">
                    ENTER THE ARENA
                  </button>
                )}

                {isBattling && (
                  <div className="py-16 text-center">
                    <div className="text-[#C5A26F] tracking-[3px] text-xs mb-4">BATTLE IN PROGRESS</div>
                    <div className="text-3xl">Calculating outcome...</div>
                  </div>
                )}

                {battleResult && (
                  <div>
                    <div className="py-10 text-center text-2xl leading-tight tracking-[-0.5px]">{battleResult}</div>
                    <button onClick={closeModal} className="w-full py-7 rounded-2xl border border-white/20 hover:bg-white/5 transition-all">
                      RETURN TO ARENA
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
