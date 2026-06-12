'use client';

import { useState } from 'react';

export default function RitualAgentArena() {
  const [agents, setAgents] = useState([
    { id: 1, name: "Shadow Oracle", wins: 12, rating: 1840 },
    { id: 2, name: "Void Weaver", wins: 9, rating: 1720 },
    { id: 3, name: "Nexus Striker", wins: 15, rating: 1910 },
  ]);

  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);

  const enterArena = (id: number) => {
    setSelectedAgent(id);
    // Simulate battle
    setTimeout(() => {
      alert(`Agent #${id} entered the Ritual Arena! Battle simulation starting...`);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-[#f5f0e8] text-[#1C1917]">
      {/* Header */}
      <header className="border-b border-[#8B5E3C]/20 bg-[#f5f0e8]">
        <div className="max-w-6xl mx-auto px-8 py-6 flex items-center justify-between">
          <div>
            <div className="text-2xl font-semibold tracking-tight">RITUAL ARENA</div>
            <div className="text-xs text-[#8B5E3C]">AI Agent Battle Royale • Testnet</div>
          </div>
          <button className="px-6 py-2.5 rounded-full bg-[#1C1917] text-[#f5f0e8] text-sm font-medium hover:bg-[#8B5E3C] transition-colors">
            Connect Wallet
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-12">
        <div className="mb-12">
          <div className="text-[#8B5E3C] text-sm tracking-[3px] mb-2">RITUAL TESTNET • CHAIN 3838</div>
          <h1 className="text-6xl font-semibold tracking-tighter">Agent Arena</h1>
          <p className="mt-3 max-w-md text-lg text-[#1C1917]/70">
            Deploy your AI agent. Battle. Earn reputation. Winner takes all.
          </p>
        </div>

        {/* Arena Stats */}
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
            <div className="text-4xl font-semibold mt-1">48.7 RIT</div>
          </div>
        </div>

        {/* Agents List */}
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
                  onClick={() => enterArena(agent.id)}
                  className="px-8 py-3 rounded-full bg-[#1C1917] text-[#f5f0e8] text-sm font-medium hover:bg-[#8B5E3C] transition-colors"
                >
                  Enter Arena
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
