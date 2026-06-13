'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sword, Trophy, Users, Zap, LogOut, Plus, ArrowRight, Shuffle,
  ChevronRight, ChevronLeft, Activity, Flame, Crown, Shield, Sparkles,
  X, Search, Lock, Star, Eye, Hexagon, ArrowUpDown,
  Volume2, VolumeX, User, ExternalLink, ArrowLeft
} from 'lucide-react';
import { ethers } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

const RITUAL_RPC = 'https://rpc.ritualfoundation.org';
const RITUAL_CHAIN_ID = 1979;
const CONTRACT_ADDRESS = '0x56351488B227BeD77074BA29Fc529464De76030C';

const ABI = [
  "function mintAgent(string name, uint256 power) external returns (uint256)",
  "function battle(uint256 agentId1, uint256 agentId2) external",
  "function getAgent(uint256 agentId) external view returns (tuple(uint256 id, string name, uint256 power, uint256 wins, uint256 rating, address owner))",
  "function agents(uint256 agentId) external view returns (uint256 id, string name, uint256 power, uint256 wins, uint256 rating, address owner)",
  "event BattleResult(uint256 indexed winnerId, uint256 indexed loserId, uint256 reward)",
  "event PowerIncreased(uint256 indexed agentId, uint256 oldPower, uint256 newPower)",
  "event AgentMinted(uint256 indexed id, address indexed owner, string name, uint256 power)"
];

interface MintedAgent {
  id: number;
  name: string;
  xHandle: string;
  wallet: string;
  power: number;
  wins: number;
  tokenId?: number;
}

interface BattleLog {
  id: number;
  attacker: string;
  defender: string;
  winner: string;
  timestamp: number;
  txHash?: string;
}

/* ══════════════════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════════════════ */
const ADMIN_X_HANDLES = ["ohmythalassa"];
const ADMIN_ADDRESSES = ["0x3883f0ddccc55ac112173bc67584952bf13b1a7d"];
const RITUAL_EXPLORER = "https://ritual-testnet.explorer.caldera.xyz";

/* ══════════════════════════════════════════════════════════════════
   SOUND MANAGER — Web Audio API generated sounds
   ══════════════════════════════════════════════════════════════════ */
const createSoundManager = () => {
  let ctx: AudioContext | null = null;
  let muted = false;

  const getCtx = () => {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };

  const playTone = (freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.12) => {
    if (muted) return;
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, c.currentTime);
      gain.gain.setValueAtTime(vol, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + dur);
    } catch {}
  };

  return {
    battle: () => {
      if (muted) return;
      try {
        const c = getCtx();
        const buf = c.createBuffer(1, c.sampleRate * 0.2, c.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.04));
        const src = c.createBufferSource();
        src.buffer = buf;
        const g = c.createGain();
        g.gain.setValueAtTime(0.25, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
        src.connect(g); g.connect(c.destination); src.start();
        playTone(220, 0.15, 'sawtooth', 0.06);
      } catch {}
    },
    victory: () => {
      [523.25, 659.25, 783.99].forEach((f, i) => setTimeout(() => playTone(f, 0.8, 'triangle', 0.1), i * 120));
      setTimeout(() => playTone(1046.5, 1.0, 'sine', 0.08), 350);
    },
    defeat: () => {
      [329.63, 293.66, 261.63].forEach((f, i) => setTimeout(() => playTone(f, 0.6, 'sawtooth', 0.06), i * 150));
    },
    click: () => playTone(880, 0.04, 'sine', 0.08),
    mint: () => {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => setTimeout(() => playTone(f, 0.3, 'sine', 0.08), i * 80));
    },
    toggleMute: () => { muted = !muted; return muted; },
    isMuted: () => muted,
  };
};

const soundManager = createSoundManager();

const randomNames = [
  "Shadow", "Void", "Nexus", "Aether", "Eclipse", "Phantom", "Nova", "Rift",
  "Specter", "Quantum", "Nebula", "Vortex", "Astral", "Chronos", "Elysium",
  "Obsidian", "Celestia", "Helix", "Orion", "Zenith", "Lunar", "Solstice"
];
const randomSuffixes = [
  "Oracle", "Weaver", "Striker", "Knight", "Reaper", "Warden", "Sage",
  "Hunter", "Lord", "Walker"
];

const generateRandomAgentName = () =>
  `${randomNames[Math.floor(Math.random() * randomNames.length)]} ${randomSuffixes[Math.floor(Math.random() * randomSuffixes.length)]}`;

const AVATAR_COLORS = ['#10B981', '#34D399', '#059669', '#84CC16', '#14B8A6', '#6EE7B7', '#A7F3D0', '#4ADE80'];

const getAgentAvatar = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getPowerColor = (power: number) => {
  if (power >= 999999) return '#A855F7'; // purple for boss
  if (power >= 90) return '#F59E0B';
  if (power >= 80) return '#10B981';
  if (power >= 70) return '#3B82F6';
  return '#8B5CF6';
};

const isBossAgent = (power: number) => power >= 999999;

const getPowerDisplay = (power: number) => {
  if (power >= 999999) return '∞';
  return power.toString();
};

const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('');

/* ══════════════════════════════════════════════════════════════════
   ANIMATED BACKGROUND — Multi-layer cinematic canvas
   ══════════════════════════════════════════════════════════════════ */
const AnimatedBackground = () => (
  <div className="fixed inset-0 z-[-1] overflow-hidden" style={{ background: '#020504' }}>
    {/* Noise grain texture */}
    <div className="absolute inset-0 opacity-[0.025]" style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
      backgroundSize: '180px 180px',
    }} />

    {/* Aurora wave — top */}
    <motion.div
      className="absolute"
      style={{
        top: '-12%', left: '-15%', width: '130%', height: '45%',
        background: 'linear-gradient(180deg, rgba(16,185,129,0.07) 0%, rgba(52,211,153,0.03) 40%, transparent 100%)',
        filter: 'blur(70px)',
      }}
      animate={{ x: [0, 60, -40, 0], opacity: [0.5, 1, 0.6, 0.5] }}
      transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
    />

    {/* Aurora wave — secondary */}
    <motion.div
      className="absolute"
      style={{
        top: '3%', left: '15%', width: '70%', height: '30%',
        background: 'linear-gradient(135deg, rgba(132,204,22,0.05) 0%, rgba(16,185,129,0.02) 50%, transparent 100%)',
        filter: 'blur(90px)',
      }}
      animate={{ x: [0, -50, 70, 0], opacity: [0.4, 0.8, 0.3, 0.4] }}
      transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
    />

    {/* Large floating orbs */}
    {[
      { size: 900, x: '5%', y: '-18%', c: 'rgba(16,185,129,0.07)', dur: 50, dx: 120, dy: -90 },
      { size: 700, x: '78%', y: '45%', c: 'rgba(20,184,166,0.05)', dur: 60, dx: -90, dy: 70 },
      { size: 650, x: '30%', y: '20%', c: 'rgba(132,204,22,0.04)', dur: 70, dx: 80, dy: -60 },
      { size: 550, x: '55%', y: '72%', c: 'rgba(52,211,153,0.05)', dur: 55, dx: -70, dy: -80 },
      { size: 450, x: '15%', y: '82%', c: 'rgba(16,185,129,0.04)', dur: 65, dx: 100, dy: 55 },
      { size: 380, x: '85%', y: '10%', c: 'rgba(110,231,183,0.03)', dur: 45, dx: -60, dy: 80 },
    ].map((orb, i) => (
      <motion.div
        key={`orb-${i}`}
        className="absolute rounded-full"
        style={{
          width: orb.size, height: orb.size, left: orb.x, top: orb.y,
          background: `radial-gradient(circle, ${orb.c} 0%, transparent 70%)`,
          filter: 'blur(50px)',
        }}
        animate={{
          x: [0, orb.dx, -orb.dx * 0.5, 0],
          y: [0, orb.dy, -orb.dy * 0.5, 0],
          scale: [1, 1.12, 0.92, 1],
        }}
        transition={{ duration: orb.dur, repeat: Infinity, ease: 'easeInOut' }}
      />
    ))}

    {/* Grid */}
    <div className="absolute inset-0" style={{
      backgroundImage: `
        linear-gradient(rgba(16,185,129,0.022) 1px, transparent 1px),
        linear-gradient(90deg, rgba(16,185,129,0.022) 1px, transparent 1px)
      `,
      backgroundSize: '60px 60px',
    }} />

    {/* Grid intersection dots */}
    {Array.from({ length: 20 }).map((_, i) => (
      <motion.div
        key={`dot-${i}`}
        className="absolute rounded-full"
        style={{
          width: 3, height: 3,
          left: `${(i * 5 + 3) % 100}%`,
          top: `${(i * 5.3 + 7) % 100}%`,
          backgroundColor: 'rgba(16,185,129,0.15)',
        }}
        animate={{ opacity: [0.1, 0.4, 0.1], scale: [1, 1.8, 1] }}
        transition={{ duration: 4 + (i % 5), repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
      />
    ))}

    {/* Floating particles — 45 */}
    {Array.from({ length: 45 }).map((_, i) => (
      <motion.div
        key={`p-${i}`}
        className="absolute rounded-full"
        style={{
          width: 1.5 + (i % 4), height: 1.5 + (i % 4),
          left: `${(i * 2.2 + 2) % 100}%`,
          top: `${(i * 2.1 + 4) % 100}%`,
          backgroundColor: ['#10B981', '#34D399', '#84CC16', '#059669', '#14B8A6', '#A7F3D0'][i % 6],
        }}
        animate={{
          y: [0, -120 - (i % 4) * 40, 0],
          x: [0, (i % 2 === 0 ? 25 : -25), 0],
          opacity: [0, 0.45 + (i % 3) * 0.15, 0],
          scale: [0.4, 1.3, 0.4],
        }}
        transition={{
          duration: 10 + (i % 8) * 2,
          repeat: Infinity,
          delay: i * 0.35,
          ease: 'easeInOut',
        }}
      />
    ))}

    {/* Floating geometric shapes */}
    {[
      { x: '12%', y: '18%', size: 22, dur: 35, rot: 360 },
      { x: '82%', y: '25%', size: 16, dur: 40, rot: -360 },
      { x: '48%', y: '75%', size: 28, dur: 45, rot: 360 },
      { x: '22%', y: '88%', size: 18, dur: 30, rot: -360 },
      { x: '92%', y: '55%', size: 14, dur: 38, rot: 360 },
      { x: '65%', y: '8%', size: 20, dur: 42, rot: -360 },
    ].map((s, i) => (
      <motion.div
        key={`shape-${i}`}
        className="absolute"
        style={{
          left: s.x, top: s.y, width: s.size, height: s.size,
          border: '1px solid rgba(16,185,129,0.06)',
          borderRadius: i % 2 === 0 ? '4px' : '0',
          clipPath: i % 3 === 0 ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
        }}
        animate={{
          rotate: [0, s.rot],
          y: [0, -25, 0],
          opacity: [0.1, 0.25, 0.1],
        }}
        transition={{ duration: s.dur, repeat: Infinity, ease: 'linear' }}
      />
    ))}

    {/* Horizontal light beams */}
    {[
      { top: '20%', opacity: 0.015, width: '60%', left: '20%', dur: 18 },
      { top: '50%', opacity: 0.01, width: '40%', left: '40%', dur: 22 },
      { top: '75%', opacity: 0.012, width: '55%', left: '10%', dur: 20 },
    ].map((beam, i) => (
      <motion.div
        key={`beam-${i}`}
        className="absolute"
        style={{
          top: beam.top, left: beam.left, width: beam.width, height: 1,
          background: `linear-gradient(90deg, transparent, rgba(16,185,129,${beam.opacity}), transparent)`,
        }}
        animate={{ opacity: [0.3, 1, 0.3], scaleX: [0.8, 1.2, 0.8] }}
        transition={{ duration: beam.dur, repeat: Infinity, ease: 'easeInOut' }}
      />
    ))}

    {/* Floating themed emojis */}
    {[
      { e: '⚔️', x: '8%', y: '15%', size: 28, dur: 25, dy: -60 },
      { e: '🔥', x: '85%', y: '25%', size: 22, dur: 30, dy: -80 },
      { e: '⚡', x: '20%', y: '70%', size: 26, dur: 22, dy: -50 },
      { e: '💎', x: '75%', y: '80%', size: 20, dur: 28, dy: -70 },
      { e: '🛡️', x: '45%', y: '10%', size: 24, dur: 32, dy: -55 },
      { e: '✨', x: '60%', y: '60%', size: 18, dur: 20, dy: -90 },
      { e: '🌟', x: '15%', y: '45%', size: 20, dur: 26, dy: -65 },
      { e: '💀', x: '90%', y: '55%', size: 22, dur: 24, dy: -45 },
      { e: '👑', x: '35%', y: '85%', size: 24, dur: 28, dy: -75 },
      { e: '🗡️', x: '55%', y: '35%', size: 20, dur: 22, dy: -60 },
      { e: '💫', x: '70%', y: '12%', size: 18, dur: 30, dy: -50 },
      { e: '🎯', x: '25%', y: '55%', size: 22, dur: 26, dy: -70 },
      { e: '🏆', x: '50%', y: '90%', size: 26, dur: 24, dy: -80 },
      { e: '💥', x: '80%', y: '45%', size: 20, dur: 20, dy: -55 },
      { e: '🔮', x: '10%', y: '90%', size: 22, dur: 28, dy: -65 },
    ].map((item, i) => (
      <motion.div
        key={`emoji-${i}`}
        className="absolute select-none pointer-events-none"
        style={{
          left: item.x, top: item.y,
          fontSize: item.size,
          filter: 'blur(0.5px)',
          opacity: 0.12,
        }}
        animate={{
          y: [0, item.dy, 0],
          x: [0, (i % 2 === 0 ? 20 : -20), 0],
          rotate: [0, (i % 2 === 0 ? 15 : -15), 0],
          opacity: [0.06, 0.15, 0.06],
          scale: [0.9, 1.1, 0.9],
        }}
        transition={{
          duration: item.dur,
          repeat: Infinity,
          delay: i * 1.2,
          ease: 'easeInOut',
        }}
      >
        {item.e}
      </motion.div>
    ))}

    {/* Energy rings — expanding from center */}
    {[0, 1, 2, 3, 4].map(i => (
      <motion.div
        key={`ring-${i}`}
        className="absolute rounded-full"
        style={{
          left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          border: '1px solid rgba(16,185,129,0.06)',
        }}
        initial={{ width: 50, height: 50, opacity: 0.3 }}
        animate={{
          width: [50, 600 + i * 100],
          height: [50, 600 + i * 100],
          opacity: [0.2, 0],
          borderWidth: [1, 0.5],
        }}
        transition={{
          duration: 8 + i * 2,
          repeat: Infinity,
          delay: i * 2,
          ease: 'easeOut',
        }}
      />
    ))}

    {/* Twinkling sparkle stars */}
    {Array.from({ length: 35 }).map((_, i) => (
      <motion.div
        key={`star-${i}`}
        className="absolute rounded-full"
        style={{
          width: 2 + (i % 3), height: 2 + (i % 3),
          left: `${(i * 2.85 + 1) % 100}%`,
          top: `${(i * 2.7 + 2) % 100}%`,
          backgroundColor: ['#10B981', '#34D399', '#84CC16', '#FBBF24', '#60A5FA', '#A78BFA'][i % 6],
          boxShadow: `0 0 4px ${['#10B981', '#34D399', '#84CC16', '#FBBF24', '#60A5FA', '#A78BFA'][i % 6]}60`,
        }}
        animate={{
          opacity: [0, 0.8, 0],
          scale: [0.5, 1.5, 0.5],
        }}
        transition={{
          duration: 2 + (i % 4),
          repeat: Infinity,
          delay: i * 0.4,
          ease: 'easeInOut',
        }}
      />
    ))}

    {/* Diagonal light streaks */}
    {[
      { x1: '10%', y1: '0%', angle: 35, len: 200, dur: 12, delay: 0 },
      { x1: '60%', y1: '20%', angle: 25, len: 150, dur: 15, delay: 4 },
      { x1: '30%', y1: '50%', angle: 40, len: 180, dur: 10, delay: 8 },
    ].map((streak, i) => (
      <motion.div
        key={`streak-${i}`}
        className="absolute"
        style={{
          left: streak.x1, top: streak.y1,
          width: streak.len, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.04), rgba(132,204,22,0.03), transparent)',
          transform: `rotate(${streak.angle}deg)`,
          filter: 'blur(1px)',
        }}
        animate={{
          x: [-100, 300],
          opacity: [0, 0.6, 0],
        }}
        transition={{
          duration: streak.dur,
          repeat: Infinity,
          delay: streak.delay,
          ease: 'easeInOut',
        }}
      />
    ))}
  </div>
);

/* ══════════════════════════════════════════════════════════════════
   CONFETTI EXPLOSION
   ══════════════════════════════════════════════════════════════════ */
const ConfettiExplosion = ({ active }: { active: boolean }) => {
  if (!active) return null;
  const particles = Array.from({ length: 70 }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 700,
    y: (Math.random() - 0.5) * 700 - 150,
    rotation: Math.random() * 720 - 360,
    color: ['#10B981', '#34D399', '#84CC16', '#F59E0B', '#3B82F6', '#EF4444', '#EC4899', '#8B5CF6', '#A7F3D0', '#FBBF24'][i % 10],
    size: 4 + Math.random() * 8,
    shape: i % 3,
  }));

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center">
      {particles.map(p => (
        <motion.div
          key={p.id}
          style={{
            position: 'absolute',
            width: p.shape === 2 ? p.size * 2.5 : p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.shape === 0 ? '50%' : '2px',
          }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotation, scale: 0.2 }}
          transition={{ duration: 1.5 + Math.random() * 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      ))}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   MOUSE SPOTLIGHT — follows cursor with emerald glow
   ══════════════════════════════════════════════════════════════════ */
const MouseSpotlight = () => {
  const [pos, setPos] = useState({ x: -200, y: -200 });
  useEffect(() => {
    const handler = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);
  return (
    <div
      className="fixed pointer-events-none z-[1]"
      style={{
        left: pos.x - 200, top: pos.y - 200,
        width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(16,185,129,0.04) 0%, transparent 70%)',
        transition: 'left 0.1s ease-out, top 0.1s ease-out',
      }}
    />
  );
};

/* ══════════════════════════════════════════════════════════════════
   FLOATING RING DECORATION — animated concentric rings
   ══════════════════════════════════════════════════════════════════ */
const FloatingRings = () => (
  <div className="fixed inset-0 z-[-1] pointer-events-none flex items-center justify-center">
    {[180, 280, 400, 540].map((size, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{
          width: size, height: size,
          border: `1px solid rgba(16,185,129,${0.04 - i * 0.008})`,
        }}
        animate={{
          rotate: i % 2 === 0 ? [0, 360] : [360, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          rotate: { duration: 30 + i * 15, repeat: Infinity, ease: 'linear' },
          scale: { duration: 6 + i * 2, repeat: Infinity, ease: 'easeInOut' },
        }}
      />
    ))}
  </div>
);

/* ══════════════════════════════════════════════════════════════════
   ANIMATED GRADIENT BORDER — rotating conic gradient
   ══════════════════════════════════════════════════════════════════ */
const GlowCard = ({ children, color = '#10B981', className = '', style = {}, ...props }: any) => (
  <motion.div
    className={`relative rounded-xl overflow-hidden ${className}`}
    {...props}
  >
    {/* Rotating gradient border */}
    <motion.div
      className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-500"
      style={{
        background: `conic-gradient(from 0deg, transparent, ${color}30, transparent, ${color}20, transparent)`,
        padding: 1,
        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        maskComposite: 'exclude',
        WebkitMaskComposite: 'xor',
      }}
      animate={{ rotate: [0, 360] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
    />
    {children}
  </motion.div>
);

/* ══════════════════════════════════════════════════════════════════
   POWER BAR
   ══════════════════════════════════════════════════════════════════ */
const PowerBar = ({ value, max = 100 }: { value: number; max?: number }) => {
  const isBoss = value >= 999999;
  const pct = isBoss ? 100 : (value / max) * 100;
  const color = getPowerColor(value);
  return (
    <div className="relative h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          background: isBoss
            ? 'linear-gradient(90deg, #A855F7, #EC4899, #A855F7)'
            : `linear-gradient(90deg, ${color}, ${color}cc)`,
          boxShadow: `0 0 10px ${color}40`,
          backgroundSize: isBoss ? '200% 100%' : undefined,
        }}
        initial={{ width: 0 }}
        animate={{
          width: `${pct}%`,
          ...(isBoss ? { backgroundPosition: ['0% 0%', '200% 0%'] } : {}),
        }}
        transition={{
          width: { duration: 1.2, ease: 'easeOut', delay: 0.3 },
          ...(isBoss ? { backgroundPosition: { duration: 2, repeat: Infinity, ease: 'linear' } } : {}),
        }}
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
   RANK BADGE
   ══════════════════════════════════════════════════════════════════ */
const RankBadge = ({ rank }: { rank: number }) => {
  if (rank === 0) return <span className="text-base">🥇</span>;
  if (rank === 1) return <span className="text-base">🥈</span>;
  if (rank === 2) return <span className="text-base">🥉</span>;
  return <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>{rank + 1}</span>;
};

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════ */
export default function RitualAgentArena() {
  const [account, setAccount] = useState<string>('');
  const [contract, setContract] = useState<any>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'arena' | 'agents' | 'profile'>('dashboard');
  const [soundMuted, setSoundMuted] = useState(false);
  const [selectedProfileAgent, setSelectedProfileAgent] = useState<MintedAgent | null>(null);
  const [opponentSearch, setOpponentSearch] = useState('');

  const [mintedAgents, setMintedAgents] = useState<MintedAgent[]>([
    { id: 1, name: "Shadow Oracle", xHandle: "shadow_ai", wallet: "0x0000", power: 83, wins: 12, tokenId: 1 },
    { id: 2, name: "Void Weaver", xHandle: "void_ops", wallet: "0x0001", power: 79, wins: 9, tokenId: 2 },
    { id: 3, name: "Nexus Striker", xHandle: "nexus_defi", wallet: "0x0002", power: 84, wins: 15, tokenId: 3 },
    { id: 4, name: "Aether Knight", xHandle: "aether_net", wallet: "0x0003", power: 76, wins: 8, tokenId: 4 },
    { id: 5, name: "Eclipse Reaper", xHandle: "eclipse_dao", wallet: "0x0004", power: 81, wins: 11, tokenId: 5 },
    { id: 6, name: "Shadow Garden", xHandle: "ohmythalassa", wallet: ADMIN_ADDRESSES[0], power: 999999, wins: 999, tokenId: 999 },
  ]);

  const [battleLogs, setBattleLogs] = useState<BattleLog[]>([
    { id: 1, attacker: "Nexus Striker", defender: "Shadow Oracle", winner: "Nexus Striker", timestamp: Date.now() - 120000 },
    { id: 2, attacker: "Eclipse Reaper", defender: "Void Weaver", winner: "Eclipse Reaper", timestamp: Date.now() - 300000 },
    { id: 3, attacker: "Shadow Oracle", defender: "Aether Knight", winner: "Shadow Oracle", timestamp: Date.now() - 480000 },
  ]);

  const [selectedAgent, setSelectedAgent] = useState<MintedAgent | null>(null);
  const [isBattling, setIsBattling] = useState(false);
  const [isBattleAnimating, setIsBattleAnimating] = useState(false);
  const [battleResult, setBattleResult] = useState<{ text: string; type: 'win' | 'lose' | 'draw' } | null>(null);
  const [opponent, setOpponent] = useState<MintedAgent | null>(null);

  const [showMintModal, setShowMintModal] = useState(false);
  const [mintName, setMintName] = useState('');
  const [mintX, setMintX] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const mintNameRef = useRef<HTMLInputElement>(null);
  const mintXRef = useRef<HTMLInputElement>(null);

  const [showConfetti, setShowConfetti] = useState(false);
  const [agentPage, setAgentPage] = useState(0);
  const [agentSearch, setAgentSearch] = useState('');
  const [agentSort, setAgentSort] = useState<'wins' | 'power' | 'name'>('wins');

  /* ─── localStorage ─── */
  useEffect(() => {
    const saved = localStorage.getItem("ritual_agents");
    if (saved) { try { setMintedAgents(JSON.parse(saved)); } catch (e) { } }
    const savedLogs = localStorage.getItem("ritual_battle_logs");
    if (savedLogs) { try { setBattleLogs(JSON.parse(savedLogs)); } catch (e) { } }
  }, []);

  // Ensure Shadow Garden boss agent always has power 999999 (fix stale localStorage)
  useEffect(() => {
    setMintedAgents(prev => {
      const hasBoss = prev.some(a => a.xHandle.toLowerCase() === 'ohmythalassa' && a.power >= 999999);
      if (hasBoss) return prev;
      return prev.map(a => a.xHandle.toLowerCase() === 'ohmythalassa' ? { ...a, power: 999999, wins: Math.max(a.wins, 999) } : a);
    });
  }, []);

  useEffect(() => {
    if (mintedAgents.length > 0) localStorage.setItem("ritual_agents", JSON.stringify(mintedAgents));
  }, [mintedAgents]);

  useEffect(() => {
    if (battleLogs.length > 0) localStorage.setItem("ritual_battle_logs", JSON.stringify(battleLogs));
  }, [battleLogs]);

  /* ─── COMPUTED ─── */
  const myAgents = useMemo(
    () => account ? mintedAgents.filter(a => a.wallet.toLowerCase() === account.toLowerCase()) : [],
    [mintedAgents, account]
  );

  const availableOpponents = useMemo(
    () => selectedAgent ? mintedAgents.filter(a => a.id !== selectedAgent.id) : mintedAgents,
    [mintedAgents, selectedAgent]
  );

  const totalAgents = mintedAgents.length;
  const totalWins = mintedAgents.reduce((sum, a) => sum + a.wins, 0);
  const avgPower = totalAgents > 0 ? Math.round(mintedAgents.reduce((sum, a) => sum + a.power, 0) / totalAgents) : 0;
  const leaderboard = useMemo(() => [...mintedAgents].sort((a, b) => b.wins - a.wins), [mintedAgents]);

  // Paginated X handle list
  const filteredAgents = useMemo(() => {
    let agents = [...mintedAgents];
    if (agentSearch) {
      const q = agentSearch.toLowerCase();
      agents = agents.filter(a =>
        a.name.toLowerCase().includes(q) || a.xHandle.toLowerCase().includes(q)
      );
    }
    agents.sort((a, b) => {
      if (agentSort === 'wins') return b.wins - a.wins;
      if (agentSort === 'power') return b.power - a.power;
      return a.name.localeCompare(b.name);
    });
    return agents;
  }, [mintedAgents, agentSearch, agentSort]);

  const agentTotalPages = Math.max(1, Math.ceil(filteredAgents.length / 10));
  const paginatedAgents = filteredAgents.slice(agentPage * 10, (agentPage + 1) * 10);

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  /* ─── WALLET ─── */
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

  /* ─── MINT ─── */
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
    // Clear refs after modal mounts
    setTimeout(() => {
      if (mintNameRef.current) mintNameRef.current.value = '';
      if (mintXRef.current) mintXRef.current.value = '';
    }, 50);
  };

  const mintNewAgent = async () => {
    const nameVal = mintNameRef.current?.value?.trim() || '';
    const xVal = mintXRef.current?.value?.trim() || '';
    if (!contract) return;
    if (!nameVal) { setErrorMsg("Please enter an agent name"); return; }
    if (!xVal) { setErrorMsg("Please enter an X handle"); return; }
    const nameLower = nameVal.toLowerCase();
    const xLower = xVal.toLowerCase();
    if (mintedAgents.find(a => a.name.toLowerCase() === nameLower)) { setErrorMsg("Agent name already taken"); return; }
    if (mintedAgents.find(a => a.xHandle.toLowerCase() === xLower)) { setErrorMsg("X handle already taken"); return; }
    try {
      const power = Math.floor(Math.random() * 16) + 80; // 80-95
      const displayName = `${nameVal} (@${xVal})`;
      const tx = await contract.mintAgent(displayName, power);
      const receipt = await tx.wait();

      // Get tokenId from AgentMinted event
      let tokenId = mintedAgents.length + 1; // fallback
      try {
        for (const log of receipt.logs) {
          const parsed = contract.interface.parseLog({ topics: log.topics as string[], data: log.data });
          if (parsed?.name === 'AgentMinted') {
            tokenId = Number(parsed.args.id);
            break;
          }
        }
      } catch (e) { console.log('Could not parse tokenId from receipt, using fallback'); }
      const newAgent: MintedAgent = { id: mintedAgents.length + 1, name: nameVal, xHandle: xVal, wallet: account, power, wins: 0, tokenId };
      setMintedAgents(prev => [...prev, newAgent]);
      soundManager.mint();
      alert(`Agent minted! Token ID: ${tokenId}\nTx: ${receipt.hash}`);
      setShowMintModal(false);
    } catch (err) { console.error(err); alert("Mint failed"); }
  };

  /* ─── ARENA ─── */
  const enterArena = (agent: MintedAgent) => {
    // Own-agent check
    if (account && agent.wallet.toLowerCase() !== account.toLowerCase()) {
      alert("You can only battle with your own agent!");
      return;
    }
    if (!account) {
      alert("Connect your wallet first to battle!");
      return;
    }
    setSelectedAgent(agent);
    setBattleResult(null);
    setOpponent(null);
    setOpponentSearch('');
    setIsBattling(false);
    setActiveView('arena');
  };

  const startBattle = async () => {
    if (!selectedAgent) return;
    if (!opponent) { alert("Select an opponent first!"); return; }
    if (!account) { alert("Connect wallet first!"); return; }
    if (selectedAgent.wallet.toLowerCase() !== account.toLowerCase()) {
      alert("You can only battle with your own agent!");
      return;
    }

    setIsBattling(true);
    setIsBattleAnimating(true);
    setBattleResult(null);

    soundManager.battle(); // battle start sound

    // On-chain battle — user must confirm in wallet (like mint)
    if (!contract) {
      alert("Connect wallet to battle on-chain!");
      setIsBattling(false); setIsBattleAnimating(false);
      return;
    }

    // Validate tokenIds exist — both agents must be minted on-chain
    if (!selectedAgent.tokenId || !opponent.tokenId) {
      alert("Both agents must be minted on-chain to battle!");
      setIsBattling(false); setIsBattleAnimating(false);
      return;
    }

    let txHash: string;
    let onChainWinnerId: number;
    let onChainLoserId: number;
    try {
      // This triggers wallet popup → user confirms → pays gas → on-chain tx
      const tx = await contract.battle(selectedAgent.tokenId, opponent.tokenId);
      const receipt = await tx.wait();
      txHash = receipt.hash;

      // Parse BattleResult event from receipt
      let parsedWinner = 0;
      let parsedLoser = 0;
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog({ topics: log.topics as string[], data: log.data });
          if (parsed?.name === 'BattleResult') {
            parsedWinner = Number(parsed.args.winnerId);
            parsedLoser = Number(parsed.args.loserId);
            break;
          }
        } catch {}
      }
      onChainWinnerId = parsedWinner;
      onChainLoserId = parsedLoser;
      console.log(`Battle on-chain! Winner: #${onChainWinnerId}, Loser: #${onChainLoserId}, Tx: ${txHash}`);
    } catch (err: any) {
      console.error("On-chain battle failed:", err.message);
      alert(`Battle failed: ${err.message}`);
      setIsBattling(false); setIsBattleAnimating(false);
      return;
    }

    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, 2800));

    // Determine result FROM ON-CHAIN EVENT
    const iWon = onChainWinnerId === selectedAgent.tokenId;
    const iLost = onChainLoserId === selectedAgent.tokenId;

    let result: { text: string; type: 'win' | 'lose' | 'draw' };
    if (iWon) {
      result = { text: `${selectedAgent.name} defeated ${opponent.name}! ⚡`, type: 'win' };
      setMintedAgents(prev => prev.map(a =>
        a.id === selectedAgent.id ? { ...a, wins: a.wins + 1 } : a
      ));
      setSelectedAgent(prev => prev ? { ...prev, wins: prev.wins + 1 } : null);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } else if (iLost) {
      result = { text: `${opponent.name} overpowered ${selectedAgent.name}`, type: 'lose' };
    } else {
      result = { text: `Draw! Equal power`, type: 'draw' };
    }

    setBattleLogs(prev => [{
      id: prev.length + 1,
      attacker: selectedAgent.name,
      defender: opponent.name,
      winner: result.type === 'win' ? selectedAgent.name : opponent.name,
      timestamp: Date.now(),
      txHash,
    }, ...prev].slice(0, 50));

    setBattleResult(result);
    if (result.type === 'win') soundManager.victory(); else if (result.type === 'lose') soundManager.defeat();
    setIsBattleAnimating(false);
    setIsBattling(false);
  };

  /* ══════════════════════════════════════════════════════════════════
     NAVBAR
     ══════════════════════════════════════════════════════════════════ */
  const Navbar = () => (
    <motion.nav
      className="sticky top-0 z-50"
      style={{
        background: 'rgba(2,5,4,0.75)',
        backdropFilter: 'blur(24px) saturate(1.3)',
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
            animate={{ boxShadow: ['0 0 12px rgba(16,185,129,0.15)', '0 0 28px rgba(16,185,129,0.35)', '0 0 12px rgba(16,185,129,0.15)'] }}
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
            { id: 'agents' as const, label: 'Agents', icon: Users },
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

          {/* Right — Sound + Wallet */}
        <div className="flex items-center gap-2">
          {/* Sound toggle */}
          <motion.button
            onClick={() => { const m = soundManager.toggleMute(); setSoundMuted(m); }}
            className="p-2 rounded-lg transition-colors"
            style={{ color: soundMuted ? 'rgba(255,255,255,0.2)' : '#10B981', background: 'rgba(255,255,255,0.03)' }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={soundMuted ? 'Unmute' : 'Mute'}
          >
            {soundMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </motion.button>

          {account ? (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono" style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-[#10B981]"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
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

  /* ══════════════════════════════════════════════════════════════════
     DASHBOARD VIEW
     ══════════════════════════════════════════════════════════════════ */
  const DashboardView = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-[1440px] mx-auto px-6 py-8"
    >
      {/* Hero */}
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
          <motion.span
            style={{
              background: 'linear-gradient(135deg, #10B981, #34D399, #84CC16)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundSize: '200% 200%',
            }}
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          >
            Prove Their Worth
          </motion.span>
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

        {/* Animated accent line */}
        <motion.div
          className="mx-auto mt-6 h-[1px] rounded-full"
          style={{ background: 'linear-gradient(90deg, transparent, #10B981, transparent)', maxWidth: 200 }}
          animate={{ opacity: [0.3, 0.8, 0.3], scaleX: [0.8, 1.2, 0.8] }}
          transition={{ duration: 3, repeat: Infinity }}
        />

        {/* Floating decorative rings around hero */}
        <div className="relative flex justify-center mt-4">
          {[60, 100, 150].map((size, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: size, height: size, top: -size / 2 - 20,
                border: `1px solid rgba(16,185,129,${0.08 - i * 0.02})`,
                borderStyle: i % 2 === 0 ? 'dashed' : 'solid',
              }}
              animate={{
                rotate: i % 2 === 0 ? [0, 360] : [360, 0],
                scale: [1, 1.08, 1],
              }}
              transition={{
                rotate: { duration: 20 + i * 10, repeat: Infinity, ease: 'linear' },
                scale: { duration: 4 + i * 1.5, repeat: Infinity, ease: 'easeInOut' },
              }}
            />
          ))}
          {/* Orbiting dots */}
          {[0, 1, 2].map(i => (
            <motion.div
              key={`orbit-${i}`}
              className="absolute w-2 h-2 rounded-full"
              animate={{
                rotate: [0, 360],
                x: [0, 70 + i * 20, 0],
                y: [0, 0, 0],
              }}
              transition={{
                duration: 8 + i * 3,
                repeat: Infinity,
                ease: 'linear',
                delay: i * 2,
              }}
              style={{
                backgroundColor: ['#10B981', '#84CC16', '#34D399'][i],
                boxShadow: `0 0 6px ${['#10B981', '#84CC16', '#34D399'][i]}80`,
                transformOrigin: `0px ${90 + i * 15}px`,
                top: -90, left: '50%',
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* Stats Row */}
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
            className="rounded-xl p-5 group cursor-default relative overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.015)',
              border: '1px solid rgba(255,255,255,0.04)',
            }}
            whileHover={{
              borderColor: `${stat.color}25`,
              y: -2,
            }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: `radial-gradient(circle at 50% 0%, ${stat.color}08 0%, transparent 70%)` }}
            />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <stat.icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
                <span className="text-[10px] font-medium tracking-[2px] uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {stat.label}
                </span>
              </div>
              <div className="text-4xl font-semibold tracking-[-2px]" style={{ color: '#f0f2f0' }}>
                <AnimatedCounter value={stat.value} />
              </div>
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

          {/* Agent Cards */}
          <div className="grid grid-cols-2 gap-3">
            {mintedAgents.map((agent, i) => {
              const isOwn = account && agent.wallet.toLowerCase() === account.toLowerCase();
              return (
                <motion.div
                  key={agent.id}
                  className="rounded-xl p-5 group relative overflow-hidden"
                  style={{
                    background: 'rgba(255,255,255,0.015)',
                    border: `1px solid ${isBossAgent(agent.power) ? 'rgba(168,85,247,0.2)' : isOwn ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)'}`,
                    boxShadow: isBossAgent(agent.power) ? '0 0 20px rgba(168,85,247,0.08)' : undefined,
                    cursor: isOwn || !account ? 'pointer' : 'default',
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  whileHover={isOwn || !account ? { borderColor: 'rgba(16,185,129,0.2)', y: -3 } : {}}
                  onClick={() => {
                    setSelectedProfileAgent(agent);
                    setActiveView('profile');
                    soundManager.click();
                  }}
                >
                  {/* Hover glow */}
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: `radial-gradient(circle at 50% 0%, ${isOwn ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)'} 0%, transparent 70%)` }}
                  />

                  <div className="relative">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-black"
                          style={{ background: getAgentAvatar(agent.name) }}
                        >
                          {getInitials(agent.name)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold tracking-tight" style={{ color: '#f0f2f0' }}>{agent.name}</div>
                            {isBossAgent(agent.power) && (
                              <motion.span
                                className="text-[8px] px-1.5 py-0.5 rounded-full font-bold tracking-wider"
                                style={{ color: '#A855F7', background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.2)' }}
                                animate={{ boxShadow: ['0 0 4px rgba(168,85,247,0.2)', '0 0 12px rgba(168,85,247,0.4)', '0 0 4px rgba(168,85,247,0.2)'] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              >
                                👑 BOSS
                              </motion.span>
                            )}
                            {isOwn && (
                              <span className="text-[8px] px-1.5 py-0.5 rounded-full font-medium" style={{ color: '#10B981', background: 'rgba(16,185,129,0.1)' }}>YOU</span>
                            )}
                          </div>
                          <div className="text-[11px]" style={{ color: 'rgba(52,211,153,0.6)' }}>@{agent.xHandle}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold tracking-tight" style={{ color: getPowerColor(agent.power) }}>{getPowerDisplay(agent.power)}</div>
                        <div className="text-[9px] uppercase tracking-[1px]" style={{ color: 'rgba(255,255,255,0.2)' }}>POWER</div>
                      </div>
                    </div>

                    <PowerBar value={agent.power} />

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1.5">
                        <Trophy className="w-3 h-3" style={{ color: '#F59E0B' }} />
                        <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>{agent.wins} wins</span>
                      </div>
                      {isOwn ? (
                        <motion.button
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: '#10B981', background: 'rgba(16,185,129,0.08)' }}
                          onClick={(e) => { e.stopPropagation(); enterArena(agent); }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Battle <ChevronRight className="w-3 h-3" />
                        </motion.button>
                      ) : (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium opacity-0 group-hover:opacity-60 transition-opacity"
                          style={{ color: 'rgba(255,255,255,0.3)' }}>
                          <Lock className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
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
                {leaderboard.slice(0, 5).map((agent, i) => (
                  <motion.div
                    key={agent.id}
                    className="flex items-center gap-4 px-5 py-3.5 group"
                    style={{ borderBottom: i < Math.min(leaderboard.length, 5) - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}
                    whileHover={{ background: 'rgba(255,255,255,0.02)' }}
                  >
                    <div className="w-6 text-center">
                      <RankBadge rank={i} />
                    </div>
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-black"
                      style={{ background: getAgentAvatar(agent.name) }}
                    >
                      {getInitials(agent.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className="text-sm font-medium truncate" style={{ color: '#f0f2f0' }}>{agent.name}</div>
                        {isBossAgent(agent.power) && <span className="text-[9px]" style={{ color: '#A855F7' }}>👑</span>}
                      </div>
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
                    {log.txHash && (
                      <a
                        href={`${RITUAL_EXPLORER}/tx/${log.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded-md transition-colors hover:opacity-80"
                        style={{ color: '#34D399', background: 'rgba(16,185,129,0.08)' }}
                        title={log.txHash}
                      >
                        ⛓️ {log.txHash.slice(0, 6)}...{log.txHash.slice(-4)}
                      </a>
                    )}
                  </div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    <span className="font-medium" style={{ color: '#f0f2f0' }}>{log.attacker}</span>
                    {' vs '}
                    <span className="font-medium" style={{ color: '#f0f2f0' }}>{log.defender}</span>
                  </div>
                  <div className="text-[10px] mt-1 flex items-center gap-2" style={{ color: log.winner === log.attacker ? '#10B981' : '#F59E0B' }}>
                    {log.winner} won
                    {log.txHash && (
                      <span className="text-[8px] font-mono px-1 py-0.5 rounded" style={{ color: '#10B981', background: 'rgba(16,185,129,0.1)' }}>
                        ⛓️ ON-CHAIN
                      </span>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );

  /* ══════════════════════════════════════════════════════════════════
     ARENA VIEW — Only own agents can battle
     ══════════════════════════════════════════════════════════════════ */
  const ArenaView = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-[1440px] mx-auto px-6 py-8"
    >
      {!selectedAgent ? (
        /* Agent Selection — Only own agents */
        <div>
          <div className="text-center mb-10 pt-8">
            <h2 className="text-4xl font-semibold tracking-[-1.5px] mb-2" style={{ color: '#f0f2f0' }}>Choose Your Fighter</h2>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {account ? `Select your agent to enter the arena (${myAgents.length} available)` : 'Connect wallet to start battling'}
            </p>
          </div>

          {!account ? (
            <div className="text-center py-16">
              <motion.div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}
                animate={{ scale: [1, 1.05, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Lock className="w-8 h-8" style={{ color: 'rgba(16,185,129,0.5)' }} />
              </motion.div>
              <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.35)' }}>Connect your wallet to battle with your agents</p>
              <motion.button
                onClick={connectWallet}
                className="px-6 py-3 rounded-xl text-sm font-bold text-black"
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Connect Wallet
              </motion.button>
            </div>
          ) : myAgents.length === 0 ? (
            <div className="text-center py-16">
              <motion.div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="w-8 h-8" style={{ color: 'rgba(245,158,11,0.5)' }} />
              </motion.div>
              <p className="text-sm mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>You don&apos;t have any agents yet</p>
              <p className="text-xs mb-6" style={{ color: 'rgba(255,255,255,0.2)' }}>Mint an agent to start battling</p>
              <motion.button
                onClick={openMintModal}
                className="px-6 py-3 rounded-xl text-sm font-bold text-black flex items-center gap-2 mx-auto"
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus className="w-4 h-4" /> Mint Agent
              </motion.button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto">
              {myAgents.map((agent, i) => (
                <motion.div
                  key={agent.id}
                  className="rounded-xl p-6 cursor-pointer text-center relative overflow-hidden"
                  style={{
                    background: 'rgba(255,255,255,0.015)',
                    border: '1px solid rgba(16,185,129,0.1)',
                  }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ borderColor: 'rgba(16,185,129,0.3)', y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => enterArena(agent)}
                >
                  {/* Glow */}
                  <motion.div
                    className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity"
                    style={{ background: 'radial-gradient(circle at 50% 0%, rgba(16,185,129,0.08) 0%, transparent 70%)' }}
                  />
                  <div className="relative">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold text-black mx-auto mb-3"
                      style={{ background: getAgentAvatar(agent.name), boxShadow: `0 0 20px ${getAgentAvatar(agent.name)}25` }}
                    >
                      {getInitials(agent.name)}
                    </div>
                    <div className="text-sm font-semibold mb-1" style={{ color: '#f0f2f0' }}>{agent.name}</div>
                    <div className="text-[10px] mb-3" style={{ color: 'rgba(52,211,153,0.5)' }}>@{agent.xHandle}</div>
                    <div className="text-2xl font-semibold tracking-tight" style={{ color: getPowerColor(agent.power) }}>{getPowerDisplay(agent.power)}</div>
                    <div className="text-[9px] uppercase tracking-[1px] mb-2" style={{ color: 'rgba(255,255,255,0.2)' }}>POWER</div>
                    <div className="flex items-center justify-center gap-1">
                      <Trophy className="w-3 h-3" style={{ color: '#F59E0B' }} />
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{agent.wins} wins</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
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
            {/* Animated border glow */}
            {isBattleAnimating && (
              <motion.div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{ border: '1px solid rgba(16,185,129,0.3)' }}
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}

            {/* Battle Header */}
            <div className="p-8 pb-6 text-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <motion.div
                className="text-[10px] font-medium tracking-[3px] mb-4"
                style={{ color: 'rgba(16,185,129,0.5)' }}
                animate={isBattleAnimating ? { color: ['rgba(16,185,129,0.5)', 'rgba(16,185,129,1)', 'rgba(16,185,129,0.5)'] } : {}}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                ⚡ ARENA MODE
              </motion.div>

              {/* Fighters */}
              <div className="flex items-center justify-center gap-8">
                {/* You */}
                <motion.div className="text-center" initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                  <motion.div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-black mx-auto mb-2"
                    style={{ background: getAgentAvatar(selectedAgent.name), boxShadow: `0 0 25px ${getAgentAvatar(selectedAgent.name)}30` }}
                    animate={isBattleAnimating ? { scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] } : {}}
                    transition={{ duration: 0.5, repeat: isBattleAnimating ? Infinity : 0 }}
                  >
                    {getInitials(selectedAgent.name)}
                  </motion.div>
                  <div className="text-sm font-semibold" style={{ color: '#f0f2f0' }}>{selectedAgent.name}</div>
                  <div className="text-xs mt-1" style={{ color: getPowerColor(selectedAgent.power) }}>Power {selectedAgent.power}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: 'rgba(245,158,11,0.6)' }}>{selectedAgent.wins} wins</div>
                </motion.div>

                {/* VS */}
                <motion.div
                  className="text-3xl font-bold"
                  style={{ color: '#10B981' }}
                  animate={isBattleAnimating ? {
                    scale: [1, 1.5, 1],
                    rotate: [0, 12, -12, 0],
                    textShadow: ['0 0 0px rgba(16,185,129,0)', '0 0 25px rgba(16,185,129,0.6)', '0 0 0px rgba(16,185,129,0)'],
                  } : {}}
                  transition={{ duration: 0.6, repeat: isBattleAnimating ? Infinity : 0 }}
                >
                  VS
                </motion.div>

                {/* Opponent */}
                <motion.div className="text-center" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                  {opponent ? (
                    <>
                      <motion.div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-black mx-auto mb-2"
                        style={{ background: getAgentAvatar(opponent.name), boxShadow: `0 0 25px ${getAgentAvatar(opponent.name)}30` }}
                        animate={isBattleAnimating ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
                        transition={{ duration: 0.5, repeat: isBattleAnimating ? Infinity : 0, delay: 0.25 }}
                      >
                        {getInitials(opponent.name)}
                      </motion.div>
                      <div className="text-sm font-semibold" style={{ color: '#f0f2f0' }}>{opponent.name}</div>
                      <div className="text-xs mt-1" style={{ color: getPowerColor(opponent.power) }}>Power {getPowerDisplay(opponent.power)}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: 'rgba(245,158,11,0.6)' }}>{opponent.wins} wins</div>
                    </>
                  ) : (
                    <></>
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
                    ⚔️ BATTLE IN PROGRESS
                  </motion.div>
                  <div className="flex justify-center gap-1.5 mt-3">
                    {[0, 1, 2, 3, 4].map(i => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: i % 2 === 0 ? '#10B981' : '#84CC16' }}
                        animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.3, 0.8] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {!battleResult && !isBattleAnimating && (
                <>
                  {/* Opponent Selection */}
                  {!opponent && (
                    <div className="mb-6">
                      <div className="text-[10px] font-medium tracking-[2px] uppercase mb-3 text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        Choose Your Opponent
                      </div>
                      {/* Search */}
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.2)' }} />
                        <input
                          type="text"
                          value={opponentSearch}
                          onChange={(e) => setOpponentSearch(e.target.value)}
                          placeholder="Search by name or X handle..."
                          className="w-full pl-9 pr-4 py-2.5 rounded-lg text-xs bg-transparent focus:outline-none"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#f0f2f0' }}
                        />
                      </div>
                      {/* Opponent grid */}
                      <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto pr-1">
                        {availableOpponents
                          .filter(a => {
                            if (!opponentSearch) return true;
                            const q = opponentSearch.toLowerCase();
                            return a.name.toLowerCase().includes(q) || a.xHandle.toLowerCase().includes(q);
                          })
                          .map((agent, i) => {
                            const isBoss = isBossAgent(agent.power);
                            return (
                              <motion.div
                                key={agent.id}
                                className="rounded-lg p-3 cursor-pointer relative overflow-hidden"
                                style={{
                                  background: 'rgba(255,255,255,0.015)',
                                  border: `1px solid ${isBoss ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.04)'}`,
                                }}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                whileHover={{ borderColor: isBoss ? 'rgba(168,85,247,0.4)' : 'rgba(16,185,129,0.2)', y: -2 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => { setOpponent(agent); soundManager.click(); }}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-black flex-shrink-0"
                                    style={{ background: getAgentAvatar(agent.name) }}
                                  >
                                    {getInitials(agent.name)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-semibold truncate" style={{ color: '#f0f2f0' }}>{agent.name}</span>
                                      {isBoss && <Crown className="w-2.5 h-2.5 flex-shrink-0" style={{ color: '#A855F7' }} />}
                                    </div>
                                    <div className="text-[10px] truncate" style={{ color: 'rgba(52,211,153,0.5)' }}>@{agent.xHandle}</div>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <div className="text-xs font-semibold" style={{ color: getPowerColor(agent.power) }}>{getPowerDisplay(agent.power)}</div>
                                    <div className="text-[9px]" style={{ color: 'rgba(245,158,11,0.5)' }}>{agent.wins}W</div>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        {availableOpponents.filter(a => {
                          if (!opponentSearch) return true;
                          const q = opponentSearch.toLowerCase();
                          return a.name.toLowerCase().includes(q) || a.xHandle.toLowerCase().includes(q);
                        }).length === 0 && (
                          <div className="col-span-2 text-center py-6 text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                            No opponents found
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Battle Button */}
                  <motion.button
                    onClick={startBattle}
                    disabled={isBattling || !opponent}
                    className="w-full py-4 rounded-xl text-sm font-bold text-black flex items-center justify-center gap-2"
                    style={{
                      background: opponent ? 'linear-gradient(135deg, #10B981, #059669)' : 'rgba(255,255,255,0.05)',
                      boxShadow: opponent ? '0 0 30px rgba(16,185,129,0.2)' : 'none',
                      color: opponent ? '#000' : 'rgba(255,255,255,0.2)',
                      cursor: opponent ? 'pointer' : 'not-allowed',
                    }}
                    whileHover={opponent ? { scale: 1.01, boxShadow: '0 0 40px rgba(16,185,129,0.35)' } : {}}
                    whileTap={opponent ? { scale: 0.99 } : {}}
                  >
                    {opponent ? <>INITIATE BATTLE <Sword className="w-4 h-4" /></> : 'Select an opponent first'}
                  </motion.button>
                </>
              )}

              {battleResult && (
                <motion.div
                  className="text-center py-4"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                >
                  <motion.div
                    className="text-5xl mb-4"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
                  >
                    {battleResult.type === 'win' ? '⚡' : battleResult.type === 'lose' ? '💀' : '🤝'}
                  </motion.div>
                  <motion.div
                    className="text-2xl font-bold mb-2 tracking-tight"
                    style={{
                      color: battleResult.type === 'win' ? '#10B981' : battleResult.type === 'lose' ? '#EF4444' : '#F59E0B',
                    }}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {battleResult.type === 'win' ? 'VICTORY!' : battleResult.type === 'lose' ? 'DEFEATED' : 'DRAW'}
                  </motion.div>
                  <motion.div
                    className="text-sm mb-4"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {battleResult.text}
                  </motion.div>

                  {/* On-chain tx indicator */}
                  <motion.div
                    className="mb-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    {battleLogs[0]?.txHash ? (
                      <a
                        href={`${RITUAL_EXPLORER}/tx/${battleLogs[0].txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-mono transition-all hover:opacity-80"
                        style={{ color: '#34D399', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}
                      >
                        <span className="text-sm">⛓️</span>
                        Recorded on Ritual Testnet
                        <span style={{ color: 'rgba(52,211,153,0.5)' }}>→</span>
                      </a>
                    ) : (
                      <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.15)' }}>
                        Off-chain battle (no wallet tx)
                      </span>
                    )}
                  </motion.div>

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

  /* ══════════════════════════════════════════════════════════════════
     AGENTS VIEW — Paginated X Handle List (10 per page)
     ══════════════════════════════════════════════════════════════════ */
  const AgentsView = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-[900px] mx-auto px-6 py-8"
    >
      {/* Header */}
      <motion.div
        className="mb-8 pt-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-semibold tracking-[-1px]" style={{ color: '#f0f2f0' }}>All Agents</h1>
          <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full" style={{ color: '#34D399', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.1)' }}>
            {filteredAgents.length} total
          </span>
        </div>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Browse all registered AI agents and their X handles</p>
      </motion.div>

      {/* Search + Sort */}
      <motion.div
        className="flex items-center gap-3 mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div
          className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <Search className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.25)' }} />
          <input
            type="text"
            value={agentSearch}
            onChange={(e) => { setAgentSearch(e.target.value); setAgentPage(0); }}
            placeholder="Search by name or X handle..."
            className="flex-1 bg-transparent text-sm focus:outline-none"
            style={{ color: '#f0f2f0' }}
          />
          {agentSearch && (
            <button onClick={() => { setAgentSearch(''); setAgentPage(0); }} style={{ color: 'rgba(255,255,255,0.3)' }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          {[
            { id: 'wins' as const, label: 'Wins', icon: Trophy },
            { id: 'power' as const, label: 'Power', icon: Zap },
            { id: 'name' as const, label: 'A-Z', icon: ArrowUpDown },
          ].map(sort => (
            <button
              key={sort.id}
              onClick={() => { setAgentSort(sort.id); setAgentPage(0); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all"
              style={{
                color: agentSort === sort.id ? '#f0f2f0' : 'rgba(255,255,255,0.3)',
                background: agentSort === sort.id ? 'rgba(16,185,129,0.1)' : 'transparent',
              }}
            >
              <sort.icon className="w-3 h-3" />
              {sort.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Agent List — 10 per page */}
      <motion.div
        className="rounded-xl overflow-hidden mb-6"
        style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)' }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* Header row */}
        <div
          className="grid grid-cols-[40px_44px_1fr_140px_80px_70px] items-center gap-3 px-5 py-2.5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <span className="text-[9px] font-medium tracking-[1.5px] uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}>#</span>
          <span className="text-[9px] font-medium tracking-[1.5px] uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}></span>
          <span className="text-[9px] font-medium tracking-[1.5px] uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}>Agent</span>
          <span className="text-[9px] font-medium tracking-[1.5px] uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}>X Handle</span>
          <span className="text-[9px] font-medium tracking-[1.5px] uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}>Power</span>
          <span className="text-[9px] font-medium tracking-[1.5px] uppercase text-right" style={{ color: 'rgba(255,255,255,0.2)' }}>Wins</span>
        </div>

        {paginatedAgents.length === 0 ? (
          <div className="py-12 text-center">
            <Search className="w-6 h-6 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>No agents found</div>
          </div>
        ) : (
          paginatedAgents.map((agent, i) => {
            const globalRank = agentPage * 10 + i;
            const isOwn = account && agent.wallet.toLowerCase() === account.toLowerCase();
            return (
              <motion.div
                key={agent.id}
                className="grid grid-cols-[40px_44px_1fr_140px_80px_70px] items-center gap-3 px-5 py-3 group"
                style={{
                  borderBottom: i < paginatedAgents.length - 1 ? '1px solid rgba(255,255,255,0.025)' : 'none',
                  background: isOwn ? 'rgba(16,185,129,0.02)' : 'transparent',
                }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                whileHover={{ background: 'rgba(255,255,255,0.025)' }}
              >
                <div className="text-center">
                  <RankBadge rank={globalRank} />
                </div>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-black"
                  style={{ background: getAgentAvatar(agent.name) }}
                >
                  {getInitials(agent.name)}
                </div>
                <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate" style={{ color: '#f0f2f0' }}>{agent.name}</span>
                  {isBossAgent(agent.power) && (
                    <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold tracking-wider flex-shrink-0" style={{ color: '#A855F7', background: 'rgba(168,85,247,0.12)' }}>👑 BOSS</span>
                  )}
                  {isOwn && (
                    <span className="text-[7px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0" style={{ color: '#10B981', background: 'rgba(16,185,129,0.1)' }}>YOU</span>
                  )}
                  </div>
                </div>
                <div className="text-[12px] font-mono truncate" style={{ color: 'rgba(52,211,153,0.6)' }}>@{agent.xHandle}</div>
                <div className="flex items-center gap-2">
                  <div className="text-xs font-semibold" style={{ color: getPowerColor(agent.power) }}>{getPowerDisplay(agent.power)}</div>
                  <div className="flex-1"><PowerBar value={agent.power} /></div>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Trophy className="w-3 h-3" style={{ color: '#F59E0B' }} />
                    <span className="text-sm font-semibold" style={{ color: '#f0f2f0' }}>{agent.wins}</span>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>

      {/* Pagination */}
      {agentTotalPages > 1 && (
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Showing {agentPage * 10 + 1}–{Math.min((agentPage + 1) * 10, filteredAgents.length)} of {filteredAgents.length}
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setAgentPage(p => Math.max(0, p - 1))}
              disabled={agentPage === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
              whileHover={{ borderColor: 'rgba(16,185,129,0.15)' }}
              whileTap={{ scale: 0.97 }}
            >
              <ChevronLeft className="w-3 h-3" /> Prev
            </motion.button>
            <div className="flex items-center gap-1">
              {Array.from({ length: agentTotalPages }, (_, i) => (
                <motion.button
                  key={i}
                  onClick={() => setAgentPage(i)}
                  className="w-8 h-8 rounded-lg text-xs font-medium transition-all"
                  style={{
                    color: agentPage === i ? '#f0f2f0' : 'rgba(255,255,255,0.3)',
                    background: agentPage === i ? 'rgba(16,185,129,0.15)' : 'transparent',
                    border: agentPage === i ? '1px solid rgba(16,185,129,0.2)' : '1px solid transparent',
                  }}
                  whileHover={{ background: 'rgba(255,255,255,0.05)' }}
                  whileTap={{ scale: 0.95 }}
                >
                  {i + 1}
                </motion.button>
              ))}
            </div>
            <motion.button
              onClick={() => setAgentPage(p => Math.min(agentTotalPages - 1, p + 1))}
              disabled={agentPage === agentTotalPages - 1}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
              whileHover={{ borderColor: 'rgba(16,185,129,0.15)' }}
              whileTap={{ scale: 0.97 }}
            >
              Next <ChevronRight className="w-3 h-3" />
            </motion.button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );

  /* ══════════════════════════════════════════════════════════════════
     AGENT PROFILE VIEW
     ══════════════════════════════════════════════════════════════════ */
  const AgentProfileView = () => {
    if (!selectedProfileAgent) return null;
    const agent = selectedProfileAgent;
    const avatarColor = getAgentAvatar(agent.name);
    const initials = agent.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const isBoss = agent.power >= 999999;

    const agentBattles = battleLogs.filter(b => b.attacker === agent.name || b.defender === agent.name);
    const wins = agentBattles.filter(b => b.winner === agent.name).length;
    const losses = agentBattles.filter(b => b.winner !== agent.name).length;
    const total = agentBattles.length || 1;
    const winRate = Math.round((wins / total) * 100);

    // Win rate donut
    const donutR = 40;
    const donutC = 2 * Math.PI * donutR;
    const winPct = (wins / total) * donutC;
    const lossPct = (losses / total) * donutC;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="max-w-[1100px] mx-auto px-6 py-8"
      >
        {/* Back button */}
        <motion.button
          onClick={() => { setSelectedProfileAgent(null); setActiveView('dashboard'); soundManager.click(); }}
          className="flex items-center gap-2 mb-6 text-xs font-medium tracking-[1px] uppercase"
          style={{ color: 'rgba(255,255,255,0.35)' }}
          whileHover={{ x: -3, color: '#10B981' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </motion.button>

        {/* Profile header */}
        <div className="flex flex-col md:flex-row gap-8 mb-10">
          {/* Avatar */}
          <motion.div
            className="flex-shrink-0 flex flex-col items-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <div
              className="w-28 h-28 rounded-2xl flex items-center justify-center text-3xl font-bold relative"
              style={{
                background: `linear-gradient(135deg, ${avatarColor}20, ${avatarColor}08)`,
                border: `2px solid ${isBoss ? 'rgba(168,85,247,0.3)' : avatarColor + '25'}`,
                color: avatarColor,
                boxShadow: isBoss ? '0 0 30px rgba(168,85,247,0.15)' : `0 0 30px ${avatarColor}10`,
              }}
            >
              {initials}
              {isBoss && (
                <div className="absolute -top-2 -right-2">
                  <Crown className="w-6 h-6 text-purple-400" />
                </div>
              )}
            </div>
            <div className="mt-3 text-center">
              <div className="text-xs font-mono tracking-wider flex items-center gap-1" style={{ color: '#10B981' }}>
                @{agent.xHandle}
                <a href={`https://x.com/${agent.xHandle}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-2.5 h-2.5 opacity-40 hover:opacity-100" />
                </a>
              </div>
            </div>
          </motion.div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold" style={{ color: '#f0f2f0' }}>{agent.name}</h1>
              {isBoss && <span className="px-2 py-0.5 text-[9px] font-bold tracking-[1.5px] uppercase rounded-full" style={{ background: 'rgba(168,85,247,0.15)', color: '#A855F7' }}>BOSS</span>}
            </div>
            <div className="text-xs font-mono mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {isBoss ? 'Shadow Garden Admin' : `Token #${agent.tokenId}`} · {agentBattles.length} battles
            </div>

            {/* Battle button for own agent */}
            {account && agent.wallet.toLowerCase() === account.toLowerCase() && !isBoss && (
              <motion.button
                onClick={() => { enterArena(agent); soundManager.click(); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium mb-4"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981' }}
                whileHover={{ scale: 1.03, boxShadow: '0 0 15px rgba(16,185,129,0.15)' }}
                whileTap={{ scale: 0.97 }}
              >
                <Sword className="w-3.5 h-3.5" /> Enter Arena
              </motion.button>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'POWER', value: isBoss ? '∞' : agent.power, color: isBoss ? '#A855F7' : getPowerColor(agent.power) },
                { label: 'WINS', value: agent.wins, color: '#10B981' },
                { label: 'LOSSES', value: losses, color: '#EF4444' },
                { label: 'WIN RATE', value: `${winRate}%`, color: '#3B82F6' },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  className="rounded-xl p-4"
                  style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)' }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="text-[9px] font-medium tracking-[2px] uppercase mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</div>
                  <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts + History */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Win rate donut */}
          <motion.div
            className="rounded-xl p-6"
            style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)' }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="text-[10px] font-medium tracking-[2px] uppercase mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>Win Rate</div>
            <div className="flex items-center justify-center">
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={donutR} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
                <circle cx="50" cy="50" r={donutR} fill="none" stroke="#10B981" strokeWidth="8"
                  strokeDasharray={`${winPct} ${donutC - winPct}`} strokeDashoffset={donutC * 0.25}
                  strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease' }}
                />
                <circle cx="50" cy="50" r={donutR} fill="none" stroke="#EF4444" strokeWidth="8"
                  strokeDasharray={`${lossPct} ${donutC - lossPct}`} strokeDashoffset={donutC * 0.25 - winPct}
                  strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease' }}
                />
                <text x="50" y="48" textAnchor="middle" fill="#f0f2f0" fontSize="16" fontWeight="bold">{winRate}%</text>
                <text x="50" y="62" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="8">{total} battles</text>
              </svg>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <div className="w-2 h-2 rounded-full bg-emerald-500" /> Win ({wins})
              </div>
              <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <div className="w-2 h-2 rounded-full bg-red-500" /> Lose ({losses})
              </div>
            </div>
          </motion.div>

          {/* Battle history */}
          <motion.div
            className="col-span-2 rounded-xl p-6 overflow-y-auto"
            style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)', maxHeight: '300px' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="text-[10px] font-medium tracking-[2px] uppercase mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Battle History ({agentBattles.length})
            </div>
            {agentBattles.length === 0 ? (
              <div className="text-xs text-center py-8" style={{ color: 'rgba(255,255,255,0.15)' }}>
                No battles yet. Enter the arena!
              </div>
            ) : (
              <div className="space-y-2">
                {agentBattles.slice(0, 20).map((b, i) => {
                  const isWin = b.winner === agent.name;
                  const opponent = b.attacker === agent.name ? b.defender : b.attacker;
                  return (
                    <motion.div
                      key={b.id}
                      className="flex items-center justify-between py-2.5 px-3 rounded-lg"
                      style={{ background: isWin ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)' }}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-[10px] font-bold tracking-wider"
                          style={{ color: isWin ? '#10B981' : '#EF4444' }}
                        >
                          {isWin ? 'W' : 'L'}
                        </div>
                        <div>
                          <div className="text-xs" style={{ color: '#f0f2f0' }}>
                            {b.attacker} vs {b.defender}
                          </div>
                          <div className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>
                            Winner: {b.winner}
                          </div>
                        </div>
                      </div>
                      <div className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {timeAgo(b.timestamp)}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    );
  };

  /* ══════════════════════════════════════════════════════════════════
     FOOTER
     ══════════════════════════════════════════════════════════════════ */
  const Footer = () => (
    <footer className="mt-20 pb-10 text-center">
      <div className="flex items-center justify-center gap-3 mb-3">
        <div className="h-px w-12" style={{ background: 'rgba(16,185,129,0.12)' }} />
        <div className="text-[10px] font-medium tracking-[2px] uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Crafted by
        </div>
        <div className="h-px w-12" style={{ background: 'rgba(16,185,129,0.12)' }} />
      </div>
      <a
        href="https://x.com/ohmythalassa"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:scale-105"
        style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.08)' }}
      >
        <span className="text-sm font-semibold" style={{ color: '#10B981' }}>Thalassa</span>
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="#10B981">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        <ExternalLink className="w-2.5 h-2.5 opacity-30" />
      </a>
      <div className="mt-3 text-[9px] tracking-[1px]" style={{ color: 'rgba(255,255,255,0.1)' }}>
        Ritual Agent Arena · Testnet
      </div>
    </footer>
  );

  /* ══════════════════════════════════════════════════════════════════
     MINT MODAL
     ══════════════════════════════════════════════════════════════════ */
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
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
                      onClick={() => { if (mintNameRef.current) mintNameRef.current.value = generateRandomAgentName(); setErrorMsg(''); }}
                      className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-md transition-colors"
                      style={{ color: '#34D399' }}
                    >
                      <Shuffle className="w-3 h-3" /> Random
                    </button>
                  </div>
                  <input
                    type="text"
                    ref={mintNameRef}
                    defaultValue=""
                    placeholder="Enter agent name"
                    className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-colors"
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
                    className="flex items-center rounded-xl transition-colors cursor-text"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    onClick={(e) => {
                      const input = e.currentTarget.querySelector('input');
                      if (input) input.focus();
                    }}
                  >
                    <span className="pl-4 text-sm select-none" style={{ color: 'rgba(52,211,153,0.4)' }}>@</span>
                    <input
                      type="text"
                      ref={mintXRef}
                      defaultValue=""
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
                className="w-full mt-6 py-3.5 rounded-xl text-sm font-bold text-black flex items-center justify-center gap-2"
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

  /* ══════════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen" style={{ color: '#f0f2f0' }}>
      <AnimatedBackground />
      <FloatingRings />
      <MouseSpotlight />
      <ConfettiExplosion active={showConfetti} />
      <Navbar />

      <AnimatePresence mode="wait">
        {activeView === 'dashboard' && <DashboardView key="dashboard" />}
        {activeView === 'arena' && <ArenaView key="arena" />}
        {activeView === 'agents' && <AgentsView key="agents" />}
        {activeView === 'profile' && <AgentProfileView key="profile" />}
      </AnimatePresence>

      {activeView !== 'profile' && <Footer />}
      <MintModal />
    </div>
  );
}
