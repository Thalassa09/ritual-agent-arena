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

interface MintedAgent {
  id: number;
  name: string;
  xHandle: string;
}

const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#0A0A0B]">
      <div className="absolute inset-0 bg-[radial-gradient(#1C1C20_0.6px,transparent_1px)] bg-[length:3px_3px] opacity-60" />
      
      <motion.div
        className="absolute -top-[30%] -left-[15%] w-[700px] h-[700px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(197,162,111,0.08) 0%, transparent 70%)' }}
        animate={{ x: [0, 60, -30, 0], y: [0, 40, -20, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <motion.div
        className="absolute -bottom-[25%] -right-[10%] w-[650px] h-[650px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(139,115,85,0.07) 0%, transparent 70%)' }}
        animate={{ x: [0, -50, 35, 0], y: [0, -35, 25, 0] }}
        transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
      />

      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-[3px] h-[3px] rounded-full bg-[#C5A26F]"
          style={{ left: `${(i * 9 + 7) % 100}%`, top: `${(i * 13) % 100}%`, opacity: 0.15 + (i % 3) * 0.08 }}
          animate={{ y: [0, -180, 0], opacity: [0.1, 0.35, 0.1] }}
          transition={{ duration: 18 + (i % 7), repeat: Infinity, delay: i * 0.6, ease: "easeInOut" }}
        />
      ))}

      <div className="absolute inset-0 bg-[linear-gradient(to_right,#161619_1px,transparent_1px)] bg-[length:120px_120px] opacity-40" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#161619_1px,transparent_1px)] bg-[length:120px_120px] opacity-40" />
    </div>
  );
};

export default function RitualAgentArena() {
  const [account, setAccount] = useState<string>('');
  const [contract, setContract] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  
  // List of minted agents (name + X handle)
  const [mintedAgents, setMintedAgents] = useState<MintedAgent[]>([]);
  
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [isBattling, setIsBattling] = useState(false);
  const [battleResult, setBattleResult] = useState<string>('');

  const [showMintModal, setShowMintModal] = useState(false);
  const [mintName, setMintName] = useState('');
  const [mintX, setMintX] = useState('');

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
    setShowMintModal(true);
    setMintName('');
    setMintX('');
  };

  const closeMintModal = () => {
    setShowMintModal(false);
  };

  const mintNewAgent = async () => {
    if (!contract || !mintName.trim() || !mintX.trim()) return;

    try {
      const displayName = `${mintName.trim()} (@${mintX.trim()})`;
      const tx = await contract.mintAgent(displayName);
      await tx.wait();

      // Add to minted agents list
      const newAgent: MintedAgent = {
        id: mintedAgents.length + 1,
        name: mintName.trim(),
        xHandle: mintX.trim(),
      };
      setMintedAgents([...mintedAgents, newAgent]);

      alert("Agent minted successfully!");
      closeMintModal();
    } catch (err) {
      console.error(err);
      alert("Mint failed");
    }
  };

  const enterArena = (agent: any) => {
    setSelectedAgent(agent);
    setBattleResult('');
    setIsBattling(false);
  };

  const startBattle = async () => {
    if (!selectedAgent || !contract) return;
    
    setIsBattling(true);
    setBattleResult('');

    try {
      const opponent = agents.find((a: any) => a.id !== selectedAgent.id)!;
      const tx = await contract.battle(selectedAgent.id, opponent.id);
      await tx.wait();

      const win = Math.random() > 0.5;
      const resultText = win 
        ? `Victory! ${selectedAgent.name} defeated ${opponent.name}` 
        : `Defeat. ${opponent.name} overpowered ${selectedAgent.name}`;

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

  return (
    <div className="min-h-screen text-white relative">
      <AnimatedBackground />

      <div className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C5A26F] to-[#8B7355] flex items-center justify-center">
              <Sword className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="font-semibold tracking-[-0.5px] text-xl">Ritual Arena</div>
              <div className="text-[10px] text-white/40 -mt-1">AGENT BATTLE PROTOCOL</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {account ? (
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 rounded-full bg-white/5 text-sm font-mono border border-white/10">
                  {account.slice(0,6)}...{account.slice(-4)}
                </div>
                <button onClick={disconnectWallet} className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 hover:bg-white/5 transition-all active:scale-[0.985]">
                  <LogOut className="w-4 h-4" /> Disconnect
                </button>
              </div>
            ) : (
              <button onClick={connectWallet} className="flex items-center gap-3 px-8 py-3 rounded-full bg-white text-black font-medium hover:bg-[#C5A26F] active:scale-[0.985] transition-all">
                Connect Wallet <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 pt-16 pb-24">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full border border-white/10 bg-white/5 text-xs tracking-[3px] mb-6">
            RITUAL TESTNET • CHAIN ID 1979
          </div>
          <h1 className="text-7xl font-semibold tracking-[-3.5px] leading-none mb-4">
            Where Agents<br />Prove Their Worth
          </h1>
          <p className="text-xl text-white/60 max-w-md mx-auto">
            Mint. Battle. Ascend. On-chain agent combat on Ritual.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-16">
          {[
            { icon: Users, label: "Active Agents", value: totalAgents },
            { icon: Trophy, label: "Battles Fought", value: totalBattles },
            { icon: Zap, label: "Avg Rating", value: avgRating || "—" },
          ].map((stat, i) => (
            <div key={i} className="border border-white/10 rounded-3xl p-8 bg-white/[0.015] hover:bg-white/[0.03] transition-all">
              <stat.icon className="w-5 h-5 text-[#C5A26F] mb-6" />
              <div className="text-4xl font-semibold tracking-tighter mb-1">{stat.value}</div>
              <div className="text-white/50 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Minted Agents List */}
        {mintedAgents.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center justify-between mb-6 px-1">
              <div>
                <div className="text-2xl font-semibold tracking-[-1px]">Minted Agents</div>
                <div className="text-white/50 text-sm">Agents that have been created on Ritual</div>
              </div>
            </div>

            <div className="border border-white/10 rounded-3xl overflow-hidden bg-white/[0.015]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-8 py-4 text-xs tracking-wider text-white/50 font-normal">#</th>
                    <th className="text-left px-8 py-4 text-xs tracking-wider text-white/50 font-normal">Agent Name</th>
                    <th className="text-left px-8 py-4 text-xs tracking-wider text-white/50 font-normal">X Handle</th>
                  </tr>
                </thead>
                <tbody>
                  {mintedAgents.map((agent, index) => (
                    <tr key={index} className="border-b border-white/10 last:border-0 hover:bg-white/[0.02] transition-all">
                      <td className="px-8 py-5 text-white/40 font-mono text-sm">{agent.id}</td>
                      <td className="px-8 py-5 font-medium">{agent.name}</td>
                      <td className="px-8 py-5 text-[#C5A26F]">@{agent.xHandle}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Agent Roster Header */}
        <div className="flex items-center justify-between mb-8 px-1">
          <div>
            <div className="text-3xl font-semibold tracking-[-1.5px]">Agent Roster</div>
            <div className="text-white/50">Choose your champion</div>
          </div>
          <button onClick={openMintModal} className="flex items-center gap-2 px-6 py-3 rounded-full border border-white/20 hover:bg-white/5 active:scale-[0.985] transition-all">
            <Plus className="w-4 h-4" /> Mint New Agent
          </button>
        </div>

        {/* Empty State */}
        {agents.length === 0 && (
          <div className="border border-white/10 rounded-3xl p-16 text-center bg-white/[0.015]">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
              <Users className="w-8 h-8 text-white/40" />
            </div>
            <div className="text-2xl font-semibold tracking-tight mb-2">No agents yet</div>
            <div className="text-white/50 mb-8">Be the first to mint an agent on Ritual</div>
            <button 
              onClick={openMintModal}
              className="px-8 py-3 rounded-full bg-white text-black font-medium hover:bg-[#C5A26F] active:scale-[0.985] transition-all"
            >
              Mint Your First Agent
            </button>
          </div>
        )}
      </div>

      {/* Battle Modal */}
      <AnimatePresence>
        {selectedAgent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6">
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              className="w-full max-w-md border border-white/10 rounded-3xl bg-[#0A0A0B] p-10 relative"
            >
              <button onClick={closeBattle} className="absolute top-6 right-6 text-white/40 hover:text-white">✕</button>

              <div className="text-center">
                <div className="text-xs tracking-[3px] text-white/40 mb-2">ARENA MODE</div>
                <div className="text-4xl font-semibold tracking-[-2px] mb-10">{selectedAgent.name}</div>
              </div>

              {!battleResult && (
                <button
                  onClick={startBattle}
                  disabled={isBattling}
                  className="w-full py-4 rounded-2xl bg-white text-black font-medium flex items-center justify-center gap-3 hover:bg-[#C5A26F] disabled:opacity-60 active:scale-[0.985] transition-all text-lg"
                >
                  {isBattling ? "BATTLE IN PROGRESS..." : "INITIATE BATTLE"}
                  {!isBattling && <Sword className="w-5 h-5" />}
                </button>
              )}

              {battleResult && (
                <div className="text-center py-8">
                  <div className="text-2xl tracking-tight mb-2">{battleResult}</div>
                  <button onClick={closeBattle} className="mt-8 text-sm text-white/60 hover:text-white">Close</button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mint Modal */}
      <AnimatePresence>
        {showMintModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6">
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              className="w-full max-w-md border border-white/10 rounded-3xl bg-[#0A0A0B] p-10 relative"
            >
              <button onClick={closeMintModal} className="absolute top-6 right-6 text-white/40 hover:text-white">✕</button>

              <div className="text-center mb-8">
                <div className="text-xs tracking-[3px] text-white/40 mb-2">CREATE AGENT</div>
                <div className="text-4xl font-semibold tracking-[-2px]">Mint New Agent</div>
              </div>

              <div className="space-y-5">
                <div>
                  <div className="text-xs text-white/50 mb-2 ml-1 tracking-wider">AGENT NAME</div>
                  <input
                    type="text"
                    value={mintName}
                    onChange={(e) => setMintName(e.target.value)}
                    placeholder="Enter agent name"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:border-[#C5A26F]/60 placeholder:text-white/30 transition-all"
                  />
                </div>
                <div>
                  <div className="text-xs text-white/50 mb-2 ml-1 tracking-wider">X HANDLE <span className="text-[#C5A26F]">*</span></div>
                  <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl focus-within:border-[#C5A26F]/60 transition-all">
                    <span className="text-white/40 pl-6 pr-2">@</span>
                    <input
                      type="text"
                      value={mintX}
                      onChange={(e) => setMintX(e.target.value)}
                      placeholder="username"
                      className="flex-1 bg-transparent px-4 py-4 text-lg focus:outline-none placeholder:text-white/30"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={mintNewAgent}
                disabled={!mintName.trim() || !mintX.trim()}
                className="w-full mt-8 py-4 rounded-2xl bg-white text-black font-medium flex items-center justify-center gap-3 hover:bg-[#C5A26F] disabled:opacity-50 active:scale-[0.985] transition-all text-lg"
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
