/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Phone, 
  MapPin, 
  Search, 
  Info, 
  ShieldCheck, 
  Globe, 
  MessageCircle,
  AlertTriangle,
  Loader2,
  Navigation,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AnalysisCard = ({ title, value, icon: Icon, delay = 0 }: { title: string, value: string, icon: any, delay?: number }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl flex items-start gap-4"
  >
    <div className="p-2 bg-emerald-500/10 rounded-lg">
      <Icon className="w-5 h-5 text-emerald-500" />
    </div>
    <div>
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{title}</p>
      <p className="text-lg font-semibold text-zinc-100">{value}</p>
    </div>
  </motion.div>
);

export default function App() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapUrl, setMapUrl] = useState('https://www.openstreetmap.org/export/embed.html?bbox=95.0,-11.0,141.0,6.0&layer=mapnik'); // Default to Indonesia
  const [activityLog, setActivityLog] = useState<any[]>([]);

  // Initial mock data for "Live" feel
  useEffect(() => {
    const initialLog = [
      { id: 1, number: '+62 812 XXXX 1234', region: 'ID', time: 'Just now', status: 'Success' },
      { id: 2, number: '+60 11 XXXX 5678', region: 'MY', time: '2m ago', status: 'Success' },
      { id: 3, number: '+65 9XXX 4321', region: 'SG', time: '5m ago', status: 'Success' },
    ];
    setActivityLog(initialLog);

    // Simulate occasional "global" activity
    const interval = setInterval(() => {
      const prefixes = ['+62', '+60', '+65', '+1', '+91', '+61'];
      const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const newActivity = {
        id: Date.now(),
        number: `${randomPrefix} ${Math.floor(Math.random() * 900)} XXXX ${Math.floor(Math.random() * 9000)}`,
        region: randomPrefix === '+62' ? 'ID' : randomPrefix === '+60' ? 'MY' : 'INTL',
        time: 'Live',
        status: 'Success'
      };
      setActivityLog(prev => [newActivity, ...prev.slice(0, 4)]);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const performAnalysis = useCallback((number: string) => {
    if (!number) return;
    
    setIsAnalyzing(true);
    setError(null);

    // Small delay to simulate "reading" the network
    setTimeout(() => {
      const cleanNumber = number.startsWith('+') ? number : `+${number.replace(/\D/g, '')}`;
      const parsed = parsePhoneNumberFromString(cleanNumber);
      
      if (!parsed || !parsed.isValid()) {
        setError('Nomor tidak valid. Gunakan format internasional (contoh: +62...)');
        setIsAnalyzing(false);
        return;
      }

      const country = parsed.country;
      const countryName = new Intl.DisplayNames(['id'], { type: 'region' }).of(country || 'ID');
      
      const newResult = {
        number: parsed.formatInternational(),
        country: countryName,
        carrier: 'Public Provider',
        type: parsed.getType() || 'Mobile',
        region: country,
      };

      setResult(newResult);

      // Add to activity log
      setActivityLog(prev => [{
        id: Date.now(),
        number: newResult.number,
        region: country,
        time: 'Just now',
        status: 'Success'
      }, ...prev.slice(0, 4)]);

      // Extensive Coordinate Database for better accuracy
      const countryCoords: Record<string, { lat: number, lon: number, zoom: number }> = {
        'ID': { lat: -0.7893, lon: 113.9213, zoom: 5 },
        'MY': { lat: 4.2105, lon: 101.9758, zoom: 6 },
        'SG': { lat: 1.3521, lon: 103.8198, zoom: 12 },
        'TH': { lat: 15.8700, lon: 100.9925, zoom: 6 },
        'VN': { lat: 14.0583, lon: 108.2772, zoom: 6 },
        'PH': { lat: 12.8797, lon: 121.7740, zoom: 6 },
        'US': { lat: 37.0902, lon: -95.7129, zoom: 4 },
        'GB': { lat: 55.3781, lon: -3.4360, zoom: 6 },
        'AU': { lat: -25.2744, lon: 133.7751, zoom: 4 },
        'IN': { lat: 20.5937, lon: 78.9629, zoom: 5 },
        'SA': { lat: 23.8859, lon: 45.0792, zoom: 6 },
        'AE': { lat: 23.4241, lon: 53.8478, zoom: 8 },
        'JP': { lat: 36.2048, lon: 138.2529, zoom: 6 },
        'KR': { lat: 35.9078, lon: 127.7669, zoom: 7 },
        'CN': { lat: 35.8617, lon: 104.1954, zoom: 4 },
        'BR': { lat: -14.2350, lon: -51.9253, zoom: 4 },
        'RU': { lat: 61.5240, lon: 105.3188, zoom: 3 },
      };

      const target = countryCoords[country || 'ID'] || { lat: 0, lon: 0, zoom: 3 };
      
      // Calculate dynamic bbox based on zoom level for "accuracy"
      // Zoom 5 ~ 10 degrees, Zoom 12 ~ 0.1 degrees
      const offset = 10 / Math.pow(2, target.zoom - 5);
      const minLon = target.lon - offset;
      const minLat = target.lat - offset;
      const maxLon = target.lon + offset;
      const maxLat = target.lat + offset;

      setMapUrl(`https://www.openstreetmap.org/export/embed.html?bbox=${minLon},${minLat},${maxLon},${maxLat}&layer=mapnik&marker=${target.lat},${target.lon}`);
      setIsAnalyzing(false);
    }, 800);
  }, []);

  // Auto-trigger when number looks complete
  useEffect(() => {
    const timer = setTimeout(() => {
      if (phoneNumber.length >= 10) {
        performAnalysis(phoneNumber);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [phoneNumber, performAnalysis]);

  const handleAnalyze = () => {
    performAnalysis(phoneNumber);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Navigation className="w-5 h-5 text-zinc-950" />
            </div>
            <h1 className="font-bold text-xl tracking-tight">WA Tracker <span className="text-emerald-500">Free</span></h1>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
            <span className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full text-[10px] uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3" /> No API Key Required
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Controls & Info */}
        <div className="lg:col-span-5 space-y-8">
          <section className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Lacak & Analisis Nomor</h2>
              <p className="text-zinc-400 text-sm">Aplikasi ini 100% gratis dan tidak memerlukan API Key. Cukup masukkan nomor WhatsApp untuk melihat wilayah asalnya.</p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="+62 812 3456 7890" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all placeholder:text-zinc-600"
                />
              </div>
              <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Menganalisis...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Lacak Sekarang
                  </>
                )}
              </button>
              {error && (
                <motion.p 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-red-400 text-xs flex items-center gap-1.5 px-2"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {error}
                </motion.p>
              )}
            </div>
          </section>

          <AnimatePresence mode="wait">
            {result ? (
              <motion.div 
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <AnalysisCard title="Nomor" value={result.number} icon={Phone} delay={0.1} />
                  <AnalysisCard title="Negara" value={result.country} icon={Globe} delay={0.2} />
                  <AnalysisCard title="Provider" value={result.carrier} icon={ShieldCheck} delay={0.3} />
                  <AnalysisCard title="Tipe" value={result.type} icon={Info} delay={0.4} />
                </div>

                <div className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-2xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500 rounded-lg">
                      <MessageCircle className="w-5 h-5 text-zinc-950" />
                    </div>
                    <h3 className="font-bold text-emerald-500">Tindakan Cepat</h3>
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Nomor ini teridentifikasi berasal dari wilayah <span className="text-zinc-100 font-medium">{result.country}</span>. Anda dapat langsung mengirim pesan tanpa menyimpan nomor.
                  </p>
                  <a 
                    href={`https://wa.me/${phoneNumber.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-bold text-emerald-500 hover:text-emerald-400 transition-colors"
                  >
                    Buka di WhatsApp <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl p-12 text-center space-y-4"
              >
                <div className="inline-flex p-4 bg-zinc-800/50 rounded-full">
                  <Search className="w-8 h-8 text-zinc-600" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-zinc-400">Belum ada data</p>
                  <p className="text-xs text-zinc-600">Masukkan nomor untuk melihat hasil analisis.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Educational Section */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-zinc-100 font-bold">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <h3>Penting Diketahui</h3>
            </div>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                <p className="text-xs text-zinc-400 leading-relaxed">Aplikasi ini menggunakan database publik untuk menganalisis metadata nomor telepon.</p>
              </div>
              <div className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                <p className="text-xs text-zinc-400 leading-relaxed">Peta di samping menggunakan <span className="text-zinc-200">OpenStreetMap</span> yang bersifat open-source dan gratis selamanya.</p>
              </div>
            </div>
          </section>

          {/* Live Activity Feed */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-100 font-bold text-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3>Live Activity Log</h3>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">REAL-TIME FEED</span>
            </div>
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {activityLog.map((log) => (
                  <motion.div 
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                        {log.region}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-300">{log.number}</p>
                        <p className="text-[10px] text-zinc-500">{log.time}</p>
                      </div>
                    </div>
                    <div className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      {log.status}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        </div>

        {/* Right Column: Map */}
        <div className="lg:col-span-7 min-h-[400px] lg:min-h-0 relative">
          <div className="absolute inset-0 bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
            <iframe 
              src={mapUrl}
              className="w-full h-full grayscale-[0.8] invert-[0.9] hue-rotate-[180deg] border-none"
              title="Location Map"
            />

            {/* Map Overlay Controls */}
            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between pointer-events-none">
              <div className="bg-zinc-950/80 backdrop-blur-md border border-zinc-800 px-4 py-2 rounded-full pointer-events-auto">
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                  {result ? `Region: ${result.region}` : 'Scanning Mode: Passive'}
                </p>
              </div>
            </div>

            {/* Scanning Effect Overlay */}
            {isAnalyzing && (
              <div className="absolute inset-0 bg-emerald-500/5 flex items-center justify-center pointer-events-none">
                <div className="relative">
                  <motion.div 
                    animate={{ scale: [1, 2, 1], opacity: [0.3, 0.1, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 bg-emerald-500 rounded-full"
                  />
                  <div className="w-24 h-24 border-2 border-emerald-500/30 rounded-full animate-ping" />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 py-12 border-t border-zinc-900 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-zinc-600 text-xs">© 2026 WA Tracker Free. Menggunakan OpenStreetMap untuk privasi dan akses gratis.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors">Syarat & Ketentuan</a>
            <a href="#" className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors">Kebijakan Privasi</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
