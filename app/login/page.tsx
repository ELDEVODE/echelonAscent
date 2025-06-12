"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@civic/auth-web3/react";

interface ScanLine {
    id: number;
    delay: number;
    duration: number;
    opacity: number;
}

interface FloatingParticle {
    id: number;
    left: string;
    top: string;
    duration: number;
    delay: number;
}

export default function Login() {
    const [isLoaded, setIsLoaded] = useState(false);
    const [scanLines, setScanLines] = useState<ScanLine[]>([]);
    const [floatingParticles, setFloatingParticles] = useState<FloatingParticle[]>([]);
    const [terminalId, setTerminalId] = useState('');

    const { signIn } = useUser();
    const router = useRouter();

    const doSignIn = useCallback(() => {
        console.log("Starting sign-in process");
        signIn()
          .then(() => {
            console.log("Sign-in completed successfully");
            router.push("/");
          })
          .catch((error) => {
            console.error("Sign-in failed:", error);
          });
    }, [signIn, router])

    useEffect(() => {
        setIsLoaded(true);
        
        // Generate random scan lines
        const lines = Array.from({ length: 12 }, (_, i) => ({
            id: i,
            delay: Math.random() * 3,
            duration: 2 + Math.random() * 3,
            opacity: 0.1 + Math.random() * 0.3
        }));
        setScanLines(lines);

        // Generate floating particles
        const particles = Array.from({ length: 20 }, (_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            duration: 3 + Math.random() * 4,
            delay: Math.random() * 2
        }));
        setFloatingParticles(particles);

        // Generate terminal ID
        setTerminalId(Math.random().toString(36).substr(2, 8).toUpperCase());
    }, []);

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden font-mono">
            {/* Cyberpunk Grid Background */}
            <div className="absolute inset-0 opacity-20">
                <div 
                    className="w-full h-full"
                    style={{
                        backgroundImage: `
                            linear-gradient(rgba(34,197,94,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(34,197,94,0.1) 1px, transparent 1px)
                        `,
                        backgroundSize: '40px 40px'
                    }}
                />
            </div>

            {/* Animated Scan Lines */}
            <div className="absolute inset-0 pointer-events-none">
                {scanLines.map((line) => (
                    <div
                        key={line.id}
                        className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent"
                        style={{
                            top: `${(line.id / scanLines.length) * 100}%`,
                            opacity: line.opacity,
                            animation: `scanLine ${line.duration}s linear infinite ${line.delay}s`
                        }}
                    />
                ))}
            </div>

            {/* Holographic Border Effect */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 border border-green-400/30 shadow-[inset_0_0_50px_rgba(34,197,94,0.1)]" />
                <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-green-400 opacity-60" />
                <div className="absolute top-0 right-0 w-32 h-32 border-r-2 border-t-2 border-green-400 opacity-60" />
                <div className="absolute bottom-0 left-0 w-32 h-32 border-l-2 border-b-2 border-green-400 opacity-60" />
                <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-green-400 opacity-60" />
            </div>

                         {/* Floating Particles */}
             <div className="absolute inset-0 pointer-events-none">
                 {floatingParticles.map((particle) => (
                     <div
                         key={particle.id}
                         className="absolute w-1 h-1 bg-green-400 rounded-full opacity-40"
                         style={{
                             left: particle.left,
                             top: particle.top,
                             animation: `float ${particle.duration}s ease-in-out infinite ${particle.delay}s`
                         }}
                     />
                 ))}
             </div>

            {/* Neural Network Lines */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
                <svg className="w-full h-full" viewBox="0 0 800 600">
                    <defs>
                        <linearGradient id="neuralGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#22c55e" stopOpacity="0" />
                            <stop offset="50%" stopColor="#22c55e" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    
                    <path d="M50,150 Q200,100 350,200 T650,180" stroke="url(#neuralGrad)" strokeWidth="1" fill="none">
                        <animate attributeName="stroke-dasharray" values="0,1000;100,900;0,1000" dur="8s" repeatCount="indefinite"/>
                    </path>
                    <path d="M100,400 Q300,350 500,450 T700,400" stroke="url(#neuralGrad)" strokeWidth="1" fill="none">
                        <animate attributeName="stroke-dasharray" values="0,1000;100,900;0,1000" dur="10s" repeatCount="indefinite"/>
                    </path>
                    <path d="M150,250 Q400,200 600,300" stroke="url(#neuralGrad)" strokeWidth="1" fill="none">
                        <animate attributeName="stroke-dasharray" values="0,1000;100,900;0,1000" dur="6s" repeatCount="indefinite"/>
                    </path>
                </svg>
            </div>

            {/* Main Content */}
            <div className={`text-center space-y-12 max-w-2xl w-full relative z-10 transition-all duration-2000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                
                {/* Status Indicator */}
                <div className="flex items-center justify-center space-x-3 mb-8">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,1)]" />
                    <span className="text-green-400 text-xs uppercase tracking-[0.2em] font-light">
                        System Online • Neural Link Active
                    </span>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,1)]" />
                </div>

                {/* Logo/Title Section */}
                <div className="space-y-6 relative">
                    {/* Glitch Effect Background */}
                    <div className="absolute inset-0 opacity-20">
                        <h1 className="text-6xl md:text-8xl font-black tracking-widest text-green-400 blur-sm animate-pulse">
                            ECHELON ASCENT
                        </h1>
                    </div>
                    
                    {/* Main Title */}
                    <h1 className="relative text-6xl md:text-8xl font-black tracking-widest">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-green-300 filter drop-shadow-[0_0_20px_rgba(34,197,94,0.8)] animate-pulse">
                            ECHELON
                        </span>
                        <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-green-400 to-emerald-400 filter drop-shadow-[0_0_20px_rgba(34,197,94,0.8)]">
                            ASCENT
                        </span>
                    </h1>
                    
                    {/* Subtitle with Typewriter Effect */}
                    <div className="space-y-2">
                        <p className="text-green-300 text-xl tracking-[0.3em] font-light uppercase">
                            Bionic Enhancement Protocol
                        </p>
                        <div className="h-px w-48 mx-auto bg-gradient-to-r from-transparent via-green-400 to-transparent" />
                        <p className="text-gray-400 text-sm tracking-[0.2em] uppercase">
                            Neural Interface • Cybernetic Integration • Genetic Optimization
                        </p>
                    </div>
                </div>

                {/* Access Panel */}
                <div className="relative bg-black/50 backdrop-blur-sm border border-green-400/30 rounded-lg p-8 shadow-[0_0_50px_rgba(34,197,94,0.1)]">
                    {/* Panel Header */}
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-green-400/20">
                        <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,1)]" />
                            <span className="text-green-400 text-sm uppercase tracking-wide">Access Terminal</span>
                        </div>
                                                 <div className="text-xs text-gray-500 font-mono">
                             ID: {terminalId}
                         </div>
                    </div>

                    {/* Biometric Scanner Visualization */}
                    <div className="mb-8 relative">
                        <div className="w-32 h-32 mx-auto relative">
                            <div className="absolute inset-0 rounded-full border-2 border-green-400/30" />
                            <div className="absolute inset-2 rounded-full border border-green-400/50" />
                            <div className="absolute inset-4 rounded-full border border-green-400/70" />
                            
                            {/* Scanning Line */}
                            <div className="absolute inset-0 rounded-full overflow-hidden">
                                <div className="w-full h-0.5 bg-green-400 absolute top-1/2 left-0 transform -translate-y-1/2 shadow-[0_0_10px_rgba(34,197,94,1)]" 
                                     style={{ animation: 'scan 3s linear infinite' }} />
                            </div>
                            
                            {/* Center Icon */}
                            <div className="absolute inset-0 flex items-center justify-center p-6">
                              <div className="relative">
                                <div className="absolute inset-0 rounded-full backdrop-blur-sm bg-black/20" />
                                <img 
                                  src="https://cdn.prod.website-files.com/6721152f5cf7d1402980ed13/6724ff46d44044c6b1599154_civic-logo-white.svg" 
                                  alt="logo" 
                                  width={100} 
                                  height={100}
                                  className="object-contain relative z-10"
                                />
                              </div>
                            </div>
                        </div>
                        <p className="text-green-300 text-sm mt-4 tracking-wide">Biometric Authentication Required</p>
                    </div>

                    {/* Access Button */}
                    <button onClick={doSignIn} className="group relative w-full bg-transparent border-2 border-green-400 text-green-400 font-bold py-4 px-8 rounded-lg uppercase tracking-widest transition-all duration-300 hover:bg-green-400/10 hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] hover:border-green-300 overflow-hidden">
                        {/* Button Background Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        
                        <div className="flex items-center justify-center space-x-4 relative z-10">
                            <svg className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span className="text-lg" >Initialize Neural Link</span>
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,1)]" />
                        </div>
                    </button>

                    {/* Security Notice */}
                    <div className="mt-6 pt-6 border-t border-green-400/20">
                        <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11C15.4,11 16,11.4 16,12V16C16,16.6 15.6,17 15,17H9C8.4,17 8,16.6 8,16V12C8,11.4 8.4,11 9,11V10C9,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.2,9 10.2,10V11H13.8V10C13.8,9 12.8,8.2 12,8.2Z"/>
                            </svg>
                            <span>Protected by Civic Auth</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="space-y-3 pt-8">
                    <div className="flex items-center justify-center space-x-4 text-xs text-gray-600 uppercase tracking-wide">
                        <span>Cybernetic Division</span>
                        <div className="w-1 h-1 bg-green-400 rounded-full" />
                        <span>Neural Enhancement Branch</span>
                        <div className="w-1 h-1 bg-green-400 rounded-full" />
                        <span>Bionic Integration Unit</span>
                    </div>
                    <p className="text-gray-700 text-xs tracking-wider">
                        © 2087 ECHELON ASCENT CORP. ALL RIGHTS RESERVED. UNAUTHORIZED ACCESS PROHIBITED.
                    </p>
                </div>
            </div>

            <style jsx>{`
                @keyframes scanLine {
                    0% { transform: translateY(-100vh); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(100vh); opacity: 0; }
                }
                
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    33% { transform: translateY(-10px) rotate(120deg); }
                    66% { transform: translateY(5px) rotate(240deg); }
                }
                
                @keyframes scan {
                    0% { transform: translateY(-50%) rotate(0deg); }
                    100% { transform: translateY(-50%) rotate(360deg); }
                }
            `}</style>
        </div>
    );
}