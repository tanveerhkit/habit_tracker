"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const goals = [
    { id: 1, label: "Namaz 5 tym", icon: "🕌", color: "neon-green" },
    { id: 2, label: "Build Personal Brand", icon: "👨‍💻", color: "neon-blue" },
    { id: 3, label: "Good Physique (Look Maxing)", icon: "💪", color: "neon-orange" },
    { id: 4, label: "Financially Stable", icon: "💰", color: "neon-yellow" }, // creating custom color or re-using
    { id: 5, label: "Good Conversational Skills", icon: "🎙️", color: "neon-purple" },
    { id: 6, label: "Start a Startup", icon: "🚀", color: "neon-red" },
    { id: 7, label: "A Nice Behaviour (With Sharp Mind)", icon: "🧠", color: "neon-pink" }, // pink/red
    { id: 8, label: "Better Eyesight", icon: "👁️", color: "neon-blue" },
    { id: 9, label: "Height Increase", icon: "📏", color: "neon-green" }
];

export default function GoalsPage() {
    // Fix scrolling: Layout has overflow-hidden, so this page needs its own scroll container
    return (
        <div className="h-screen overflow-y-auto w-full bg-black text-white p-4 md:p-8 flex flex-col items-center">
            {/* Header */}
            <header className="w-full max-w-5xl flex items-center justify-between mb-8 md:mb-12">
                <Link href="/" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                    <span>←</span> Back to Dashboard
                </Link>
                <div className="text-right">
                    <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter">2026 VISION</h1>
                    <p className="text-neon-blue font-handwriting text-xl md:text-2xl mt-1">(Inshallah)</p>
                </div>
            </header>

            {/* Grid */}
            <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {goals.map((goal, index) => (
                    <motion.div
                        key={goal.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="glass bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-4 hover:bg-white/10 transition-colors group relative overflow-hidden min-h-[200px]"
                    >
                        <div className={`absolute top-0 left-0 w-full h-1 bg-${goal.color} opacity-50`} />

                        <div className="text-6xl md:text-7xl group-hover:scale-110 transition-transform duration-300 filter drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                            {goal.icon}
                        </div>
                        <h3 className="text-lg md:text-xl font-bold font-sans tracking-wide text-gray-200 group-hover:text-white">
                            {goal.label}
                        </h3>
                    </motion.div>
                ))}
            </div>

            <footer className="mt-12 text-gray-600 text-sm">
                Make it happen.
            </footer>
        </div>
    );
}
