'use client';

import { useState } from 'react';
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
  "function battle(uint256 agentId1, uint256 agentId2) external",
  "function getAgent(uint256 agentId) external view returns (tuple(uint256 id, string name, uint256 wins, uint256 rating, address owner))"
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
  const [agents] = useState<Agent[]>([
    { id: 1, name: "Shadow Oracle", wins: 12, rating: 1840 },
    { id: 2, name: "Void Weaver", wins: 9, rating: 1720 },
    { id: 3, name: "Nexus Striker", wins: 15, rating: 1910 },
  ]);
  
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isBattling, setIsBattling] = useState(false);
  const [battleResult, setBattleResult] = useState<string>('');

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Install MetaMask dulu");
      return;
    }

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
    if (!contract) return alert("Connect wallet dulu");
    
    const name = prompt("Nama agent:");
    if (!name) return;

    try {
      const tx = await contract.mintAgent(name);
      await tx.wait();
      alert("Agent berhasil di-mint!");
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
      setBattleResult(`Battle selesai! Cek explorer untuk hasil.`);
    } catch (err) {
      console.error(err);
      setBattleResult("Battle gagal");
    }
    
    setIsBattling(false);
  };

  const closeModal = () => {
    setSelectedAgent(null);
    setBattleResult('');
    setIsBattling(false);
  };

  return (
    <div className="min-h-screen bg-[#f5f0e8] text-[#1C1917]">
      <header className="border-b border-[#8B5E3C]/20 bg-[#f5f0e8]">
        <div className="max-w-6xl mx-auto px-8 py-6 flex items-center justify-between">
          <div>
            <div className="text-2xl font-semibold tracking-tight">RITUAL ARENA</div>
            <div className="text-xs text-[#8B5E3C]">AI Agent Battle Royale • Testnet</div>
          </div>
          
          <div className="flex gap-3">
            {account && (
              <>
                <button 
                  onClick={mintNewAgent}
                  className="px-5 py-2.5 rounded-full border border-[#8B5E3C] text-sm hover:bg-[#8B5E3C] hover:text-white transition-colors"
                >
                  Mint Agent
                </button>
                <button 
                  onClick={disconnectWallet}
                  className="px-5 py-2.5 rounded-full border border-[#8B5E3C] text-sm hover:bg-red-600 hover:text-white transition-colors"
                >
                  Disconnect
                </button>
              </>
            )}
            <button 
              onClick={connectWallet}
              className="px-6 py-2.5 rounded-full bg-[#1C1917] text-[#f5f0e8] text-sm font-medium hover:bg-[#8B5E3C] transition-colors"
            >
              {account ? `${account.slice(0,6)}...${account.slice(-4)}` : 'Connect Wallet'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-12">
        <div className="mb-12">
          <div className="text-[#8B5E3C] text-sm tracking-[3px] mb-2">RITUAL TESTNET • CHAIN 1979</div>
          <h1 className="text-6xl font-semibold tracking-tighter">Agent Arena</h1>
          <p className="mt-3 max-w-md text-lg text-[#1C1917]/70">
            Deploy your AI agent. Battle. Earn reputation. Winner takes all.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-12">
          <div className="border border-[#8B5E3C]/20 p-6 rounded-2xl">
            <div className="text-xs text-[#8B5E3C]">ACTIVE AGENTS</div>
            <div className="text-4xl font-semibold mt-1">247</div>
          </div>
          <div className="border border-[#8B5E3C]/20 p-6 rounded-2xl">
            <div className="text-xs text-[#8B5E3C]">BATTLES TODAY</div>
            <div className="text-4xl font-semibold mt-1">1,842</div>
          </div>
          <div className="border border-[#8B5E3C]/20 p-6 rounded-2xl">
            <div className="text-xs text-[#8B5E3C]">TOTAL REWARDS</div>
            <div className="text-4xl font-semibold mt-1">48.7 RITUAL</div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="text-xl font-semibold">Top Agents</div>
            <button className="text-sm text-[#8B5E3C] hover:underline">View all →</button>
          </div>

          <div className="space-y-3">
            {agents.map((agent) => (
              <div 
                key={agent.id}
                className="flex items-center justify-between border border-[#8B5E3C]/20 rounded-2xl px-8 py-6 hover:border-[#8B5E3C] transition-all"
              >
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-full bg-[#8B5E3C]/10 flex items-center justify-center text-[#8B5E3C] font-mono text-sm">
                    #{agent.id}
                  </div>
                  <div>
                    <div className="font-semibold text-xl">{agent.name}</div>
                    <div className="text-sm text-[#8B5E3C]">{agent.wins} wins • Rating {agent.rating}</div>
                  </div>
                </div>
                
                <button 
                  onClick={() => enterArena(agent)}
                  className="px-8 py-3 rounded-full bg-[#1C1917] text-[#f5f0e8] text-sm font-medium hover:bg-[#8B5E3C] transition-colors"
                >
                  Enter Arena
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Battle Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#f5f0e8] w-full max-w-md mx-4 rounded-3xl border border-[#8B5E3C]/30 overflow-hidden">
            <div className="px-8 pt-8 pb-6">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="text-[#8B5E3C] text-xs tracking-[2px]">RITUAL ARENA</div>
                  <div className="text-3xl font-semibold mt-1">{selectedAgent.name}</div>
                </div>
                <button onClick={closeModal} className="text-[#8B5E3C] text-xl">×</button>
              </div>

              {!battleResult && !isBattling && (
                <button 
                  onClick={startBattle}
                  className="w-full py-4 rounded-2xl bg-[#1C1917] text-[#f5f0e8] font-medium text-lg hover:bg-[#8B5E3C] transition-colors"
                >
                  Start Battle
                </button>
              )}

              {isBattling && (
                <div className="py-8 text-center">
                  <div className="text-[#8B5E3C] mb-2">BATTLE IN PROGRESS</div>
                  <div className="text-2xl font-semibold">Submitting to Ritual...</div>
                </div>
              )}

              {battleResult && (
                <div className="py-6">
                  <div className="text-center text-lg leading-tight">{battleResult}</div>
                  <button 
                    onClick={closeModal}
                    className="mt-8 w-full py-4 rounded-2xl border border-[#8B5E3C] text-sm font-medium hover:bg-[#8B5E3C] hover:text-[#f5f0e8] transition-colors"
                  >
                    Return to Arena
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
