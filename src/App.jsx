import React, { useState, useRef, useEffect } from 'react';
import { extractFramesFromVideoFile, extractAudioFromVideo } from './videoUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Upload, Download, Zap, BarChart3, Play, Palette, Music, Layers, 
  Megaphone, Target, BrainCircuit, Loader2, Sparkles, ArrowRight, User, AlertCircle, Copy, CheckCircle, AlignLeft, Globe, Type, RefreshCcw, ScanFace, Timer, Video, TrendingUp, AlertTriangle, Aperture, Scissors, Film
} from 'lucide-react';

// ==========================================
// 1. UTILITIES
// ==========================================

const parseTimestamp = (timeStr) => {
  if (!timeStr) return 0;
  try {
    const cleanStr = timeStr.toString().toLowerCase().replace(/s|start/g, '').trim();
    if (cleanStr.includes(':')) {
      const parts = cleanStr.split(':');
      return (parseInt(parts[0]) * 60) + parseInt(parts[1]);
    }
    const seconds = parseInt(cleanStr);
    return isNaN(seconds) ? 0 : seconds;
  } catch (e) { return 0; }
};

const formatMinSec = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const copyToClipboard = (data) => {
  if (!data) return;
  const text = `Ad: ${data.meta.product_name}\nHook: ${data.strategy?.hook_tactic}\nScript: ${data.content_xray?.script}`;
  navigator.clipboard.writeText(text);
  alert("Analysis copied.");
};

// --- AGENCY-GRADE PDF GENERATOR (PREMIUM ONE-PAGER) ---
const generatePDF = (data) => {
  try {
    if (!data) throw new Error("No data.");
    const doc = new jsPDF();
    const meta = data.meta || {};
    const strategy = data.strategy || {};
    const creative = data.creative_intelligence || {};
    const production = data.production_analysis || {}; 
    const comms = data.communication_profile || {}; 
    const xray = data.content_xray || {};
    const critique = data.critique || {};
    const takeaways = data.brand_takeaways || [];

    // --- 1. PREMIUM HEADER ---
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, 210, 40, 'F');
    
    // Branding
    doc.setFont("helvetica", "bold"); 
    doc.setFontSize(20); 
    doc.setTextColor(255, 255, 255);
    doc.text("CREATIVE STRATEGY BRIEF", 14, 18);
    
    // Metadata
    doc.setFontSize(9); 
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(`CAMPAIGN: ${meta.product_name || 'Ad Creative'}`, 14, 26);
    doc.text(`DATE: ${new Date().toLocaleDateString()}  |  FORMAT: ${meta.ad_type || 'Video Ad'}`, 14, 31);

    // Score Badge
    doc.setFillColor(99, 102, 241); // Indigo 500
    doc.roundedRect(175, 8, 22, 22, 2, 2, 'F');
    doc.setTextColor(255, 255, 255); 
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text(`${meta.quality_score}`, 186, 19, { align: 'center' });
    doc.setFontSize(6);
    doc.text("SCORE", 186, 26, { align: 'center' });

    let currentY = 50;

    // --- 2. THE BLUEPRINT (Split Grid Layout) ---
    // We use two tables side-by-side for maximum data density
    
    doc.setFontSize(10); doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold");
    doc.text("1. CAMPAIGN BLUEPRINT", 14, currentY);
    currentY += 4;

    // Left Col: Strategy
    autoTable(doc, {
        startY: currentY,
        head: [['STRATEGIC CORE']],
        body: [
            [`HOOK:\n${strategy.hook_tactic}`],
            [`RETENTION:\n${strategy.winning_factor}`],
            [`CONCEPT:\n"${strategy.one_liner}"`],
            [`INSIGHT:\n${meta.hero_insight}`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [51, 65, 85], fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 3, valign: 'top', cellWidth: 88 },
        margin: { left: 14 }
    });

    // Right Col: Signals
    autoTable(doc, {
        startY: currentY,
        head: [['TECHNICAL SIGNALS']],
        body: [
            [`LANGUAGE: ${xray.language}\nETHNICITY: ${xray.ethnicity}`],
            [`GEAR: ${production.camera_gear}\nGRADE: ${production.color_grade}`],
            [`AUDIO: ${xray.audio_desc}`],
            [`TONE: ${comms.voiceover_tone}\nCTA: ${comms.cta_text}`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [71, 85, 105], fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 3, valign: 'top', cellWidth: 88 },
        margin: { left: 108 } // Push to right side
    });

    // Sync Y position to the taller table
    currentY = doc.lastAutoTable.finalY + 12;

    // --- 3. STRATEGIC PLAYBOOK (Split Color-Coded) ---
    doc.setFontSize(10); doc.setTextColor(15, 23, 42);
    doc.text("2. STRATEGIC PLAYBOOK", 14, currentY);
    currentY += 4;

    const maxRows = Math.max(takeaways.length, (critique.missed_opportunities || []).length);
    const playbookData = [];
    for(let i=0; i<maxRows; i++) {
        playbookData.push([
            takeaways[i] ? `• ${takeaways[i]}` : "",
            critique.missed_opportunities?.[i] ? `• ${critique.missed_opportunities[i]}` : ""
        ]);
    }

    autoTable(doc, {
        startY: currentY,
        head: [['WHAT WORKED (Keep)', 'OPTIMIZATION (Test)']],
        body: playbookData,
        theme: 'grid',
        headStyles: { 
            fillColor: [255, 255, 255], 
            textColor: [15, 23, 42], 
            lineWidth: 0.1, 
            lineColor: [200, 200, 200] 
        },
        columnStyles: {
            0: { cellWidth: 90, textColor: [22, 163, 74] }, // Emerald Text
            1: { cellWidth: 90, textColor: [194, 65, 12] }  // Amber Text
        },
        styles: { fontSize: 8, cellPadding: 3, valign: 'top' },
        didParseCell: (data) => {
            // Custom Header Colors
            if (data.section === 'head') {
                if (data.column.index === 0) data.cell.styles.fillColor = [220, 252, 231]; // Light Green Bg
                if (data.column.index === 1) data.cell.styles.fillColor = [255, 237, 213]; // Light Orange Bg
            }
        }
    });
    currentY = doc.lastAutoTable.finalY + 12;

    // --- 4. NARRATIVE BEAT SHEET ---
    doc.setFontSize(10); doc.setTextColor(15, 23, 42);
    doc.text("3. NARRATIVE BEAT SHEET", 14, currentY);
    currentY += 4;

    const sceneRows = data.scene_by_scene?.map(s => [s.timecode, s.segment.toUpperCase(), s.visual]) || [];

    autoTable(doc, {
        startY: currentY,
        head: [['TIME', 'PHASE', 'VISUAL ACTION']],
        body: sceneRows,
        theme: 'plain',
        headStyles: { fillColor: [241, 245, 249], textColor: [100, 116, 139], fontSize: 7, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2,  borderBottom: '1px solid #e2e8f0' },
        columnStyles: { 
            0: { cellWidth: 15, fontStyle: 'bold' },
            1: { cellWidth: 35, textColor: [99, 102, 241], fontStyle: 'bold', fontSize: 7 },
            2: { cellWidth: 'auto' }
        }
    });

    // --- FOOTER ---
    const pageHeight = doc.internal.pageSize.height;
    doc.setFillColor(248, 250, 252);
    doc.rect(0, pageHeight - 15, 210, 15, 'F');
    
    doc.setFontSize(7); doc.setTextColor(148, 163, 184);
    doc.text("CONFIDENTIAL  |  GENERATED BY DRAPER AI", 14, pageHeight - 6);
    doc.text(new Date().toISOString(), 160, pageHeight - 6);

    doc.save(`${meta.product_name}_StrategyOnePager.pdf`);
  } catch (e) { alert("PDF Generation Failed: " + e.message); }
};

// ==========================================
// 2. UI COMPONENTS
// ==========================================

const Pill = ({ icon: Icon, label, value, compact = false }) => {
    const isMissing = !value || value === 'N/A' || value === 'None' || value === 'Not specified';
    return (
        <div className={`flex flex-col ${compact ? 'gap-1 mb-2' : 'gap-1.5 mb-4'}`}>
            <div className="flex items-center gap-2 text-slate-400">
                {Icon && <Icon className="w-3 h-3" />}
                <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
            </div>
            <div className={`text-sm font-medium leading-tight ${isMissing ? 'text-slate-300 italic' : 'text-slate-800'}`}>
                {isMissing ? '—' : value}
            </div>
        </div>
    );
};

const Card = ({ children, className = "", title, icon: Icon, action }) => (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col ${className}`}>
        {(title || action) && (
            <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                {title && (
                    <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        {Icon && <Icon className="w-3.5 h-3.5 text-indigo-500" />} {title}
                    </h3>
                )}
                {action}
            </div>
        )}
        <div className="p-5 flex-1 min-h-0 flex flex-col overflow-y-auto custom-scrollbar">{children}</div>
    </div>
);

const LoadingView = ({ progress, frames }) => {
    const messages = ["Extracting visual keyframes...", "Analyzing color grading...", "Detecting narrative arc...", "Synthesizing strategy..."];
    const [msgIndex, setMsgIndex] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => setMsgIndex(prev => (prev + 1) % messages.length), 3000); 
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 font-sans p-8 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950"></div>
            <div className="relative z-10 w-full max-w-2xl flex flex-col items-center">
                <div className="flex gap-4 mb-12 opacity-40">
                    {frames.slice(0, 4).map((frame, i) => (
                        <div key={i} className="w-32 h-20 bg-slate-800 rounded-lg border border-slate-700 overflow-hidden relative shadow-2xl transform transition-all duration-700" style={{transform: `translateY(${i % 2 === 0 ? '-10px' : '10px'})`}}>
                            <img src={frame} alt="" className="w-full h-full object-cover opacity-60" />
                            <div className="absolute inset-0 bg-indigo-500/20 animate-pulse"></div>
                        </div>
                    ))}
                </div>
                <div className="w-16 h-16 mb-8 relative">
                    <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                    <BrainCircuit className="absolute inset-0 m-auto w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-light tracking-tight mb-3">Processing Intelligence</h2>
                <p className="text-sm text-slate-400 font-medium mb-8 h-6">{messages[msgIndex]}</p>
                <div className="w-64 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
        </div>
    );
};

const UploadView = ({ onFileSelect }) => {
    const fileRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.length) onFileSelect(e.dataTransfer.files[0]); };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans p-6 relative overflow-hidden" onDragOver={(e) => {e.preventDefault(); setIsDragging(true)}} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            <div className={`relative z-10 text-center max-w-xl transition-all duration-500 ${isDragging ? 'scale-105' : 'scale-100'}`}>
                <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-slate-200 border border-slate-100">
                    <img src="/data.png" alt="Draper Logo" className="w-16 h-16 rounded-xl object-cover" />
                </div>
                <h1 className="text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">Draper.</h1>
                <p className="text-lg text-slate-500 mb-10 font-medium">Creative Intelligence for modern Brand teams.</p>
                <div onClick={() => fileRef.current.click()} className={`group bg-white border-2 border-dashed rounded-3xl p-16 cursor-pointer transition-all duration-300 ${isDragging ? 'border-indigo-500 shadow-2xl scale-105 ring-4 ring-indigo-50' : 'border-slate-200 hover:border-indigo-400 hover:shadow-xl'}`}>
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-indigo-50 transition-colors">
                        <Upload className={`w-8 h-8 ${isDragging ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-600'} transition-colors`} />
                    </div>
                    <div className="text-xl font-bold text-slate-900">Upload Video Ad</div>
                    <p className="text-sm text-slate-400 mt-2 font-medium">MP4, MOV supported up to 100MB</p>
                    <input type="file" ref={fileRef} className="hidden" accept="video/*" onChange={(e) => e.target.files.length && onFileSelect(e.target.files[0])} />
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 3. THE REFINED STORYBOARD (Timeline V3)
// ==========================================

const VisualTimeline = ({ scenes, onJump, frames, videoDuration }) => {
    const getFrameForTime = (timecode) => {
        if (!frames || frames.length === 0 || !videoDuration) return null;
        const seconds = parseTimestamp(timecode);
        const index = Math.floor((seconds / videoDuration) * frames.length);
        return frames[Math.min(Math.max(0, index), frames.length - 1)];
    };

    const getSegmentColor = (type) => {
        const t = (type || "").toLowerCase();
        if (t.includes('hook') || t.includes('intro')) return 'bg-rose-500 text-rose-50';
        if (t.includes('problem') || t.includes('challenge')) return 'bg-slate-800 text-slate-50';
        if (t.includes('solution') || t.includes('benefit') || t.includes('demo') || t.includes('feature')) return 'bg-indigo-600 text-indigo-50';
        if (t.includes('cta') || t.includes('action') || t.includes('offer')) return 'bg-emerald-500 text-emerald-50';
        return 'bg-blue-500 text-blue-50';
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex h-2 w-full rounded-full overflow-hidden mb-8 bg-slate-100 shrink-0">
                {scenes.map((scene, i) => {
                    const colorClass = getSegmentColor(scene.segment).split(" ")[0]; 
                    return <div key={i} className={`h-full flex-1 ${colorClass} border-r border-white/20`} />;
                })}
            </div>
            
            <div className="flex-1 min-h-0 overflow-y-auto pr-4 custom-scrollbar relative pl-2">
                <div className="absolute left-[8.5rem] top-4 bottom-4 w-0.5 bg-slate-100 -z-10"></div>
                {scenes.map((scene, i) => {
                    const thumbnail = getFrameForTime(scene.timecode);
                    const colorStyle = getSegmentColor(scene.segment);
                    return (
                        <div key={i} className="flex gap-6 group cursor-pointer relative mb-8 last:mb-0 items-start" onClick={() => onJump(scene.timecode)}>
                            <div className="w-28 shrink-0 flex flex-col items-end gap-2">
                                <span className="text-[10px] font-mono font-bold text-slate-400 group-hover:text-indigo-600 transition-colors bg-white px-1">
                                    {scene.timecode.split('-')[0]}
                                </span>
                                <div className="w-28 h-16 rounded-lg border-2 border-white shadow-md overflow-hidden relative group-hover:scale-105 transition-transform bg-slate-100">
                                    {thumbnail ? (
                                        <img src={thumbnail} alt="frame" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300"><Film className="w-5 h-5" /></div>
                                    )}
                                </div>
                            </div>
                            <div className="w-4 flex justify-center pt-8 relative">
                                <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm z-10 ${colorStyle.split(" ")[0]}`}></div>
                            </div>
                            <div className="flex-1 bg-slate-50 rounded-xl p-4 border border-slate-100 group-hover:border-indigo-100 group-hover:bg-indigo-50/30 transition-all shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wide ${colorStyle}`}>
                                        {scene.segment}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-800 font-medium leading-relaxed mb-2">{scene.visual}</p>
                                {scene.audio && (
                                    <p className="text-xs text-slate-500 italic flex items-center gap-1.5">
                                        <Music className="w-3 h-3 text-slate-400" /> {scene.audio}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const ReportView = ({ data, videoUrl, onReset, frames, videoDuration }) => {
  const videoRef = useRef(null);
  const meta = data.meta || {};
  const xray = data.content_xray || {}; 
  const strategy = data.strategy || {};
  const creative = data.creative_intelligence || {};
  const production = data.production_analysis || {}; 
  const comms = data.communication_profile || {}; 
  const critique = data.critique || {};
  const scenes = data.scene_by_scene || [];

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 pb-20">
      
      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
            <img src="/data.png" alt="Logo" className="w-8 h-8 rounded-lg shadow-sm" />
            <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900">{meta.product_name || "Campaign Analysis"}</h1>
                <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-500">{meta.brand_name}</span>
                    <span className="text-slate-300">•</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{meta.ad_type}</span>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex flex-col items-end mr-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quality Score</span>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900">{meta.quality_score}</span>
                    <span className="text-sm text-slate-400 font-medium">/ 10</span>
                </div>
            </div>
            <button onClick={onReset} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><RefreshCcw className="w-5 h-5" /></button>
            <button onClick={() => copyToClipboard(data)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><Copy className="w-5 h-5" /></button>
            <button onClick={() => generatePDF(data)} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-slate-200"><Download className="w-4 h-4" /> Export Brief</button>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        
        {/* ROW 1: HERO & XRAY */}
        <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-4 bg-slate-900 text-white rounded-xl p-8 relative overflow-hidden flex flex-col justify-center shadow-xl min-h-[240px]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4 text-indigo-400">
                        <BrainCircuit className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-widest">Core Insight</span>
                    </div>
                    <p className="text-lg font-medium leading-relaxed text-slate-50">"{meta.hero_insight}"</p>
                </div>
            </div>

            <div className="col-span-12 lg:col-span-8 grid grid-cols-2 gap-6">
                <Card title="Targeting Persona" icon={User}>
                    <div className="grid grid-cols-2 gap-4">
                        <Pill label="Ethnicity / Style" value={xray.ethnicity} compact />
                        <Pill label="Language" value={xray.language} compact />
                        <Pill label="Creator Persona" value={creative.creator_persona} compact />
                    </div>
                </Card>
                <Card title="Production Tech" icon={Aperture}>
                    <div className="grid grid-cols-2 gap-4">
                        <Pill label="Audio Style" value={xray.audio_desc} compact />
                        <Pill label="Text Overlay" value={xray.text_overlay} compact />
                        <Pill label="Camera Gear" value={production.camera_gear} compact />
                    </div>
                </Card>
            </div>
        </div>

        {/* ROW 2: MAIN WORKSPACE */}
        <div className="grid grid-cols-12 gap-6">
            
            {/* COLUMN 1: PLAYER & SIGNALS (Left) */}
            <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
                <div className="bg-black rounded-xl overflow-hidden shadow-lg border border-slate-900 aspect-[9/16] relative shrink-0 group">
                    <video ref={videoRef} src={videoUrl} controls className="w-full h-full object-contain" />
                </div>
                
                <Card title="Creative Signals" icon={Zap} className="flex-1">
                    <div className="grid grid-cols-1 gap-2">
                        <Pill label="Color Grade" value={production.color_grade} icon={Palette} compact />
                        <Pill label="Editing Pace" value={production.editing_pace} icon={Scissors} compact />
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Palette</span>
                        <div className="flex gap-2">
                            {creative.color_palette?.map((hex, i) => (
                                <div key={i} className="w-6 h-6 rounded-full border border-slate-200 shadow-sm" style={{ backgroundColor: hex }} title={hex}></div>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>

            {/* COLUMN 2: STRATEGY ENGINE (Middle) */}
            <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
                <Card title="Winning Formula" icon={Target} className="shrink-0">
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div>
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 uppercase tracking-wider mb-2 inline-block">Hook (0-3s)</span>
                            <p className="text-sm font-bold text-slate-900 leading-tight">{strategy.hook_tactic}</p>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 uppercase tracking-wider mb-2 inline-block">Retention</span>
                            <p className="text-sm font-medium text-slate-700 leading-tight">{strategy.winning_factor}</p>
                        </div>
                    </div>
                    
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 italic text-slate-600 text-xs mb-4">
                        "{strategy.one_liner}"
                    </div>

                    <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                         <Pill label="Voiceover Tone" value={comms.voiceover_tone} compact />
                         <Pill label="Call to Action" value={comms.cta_text} compact />
                    </div>
                </Card>

                <Card title="Strategic Playbook" icon={TrendingUp}>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Validation</span>
                            <ul className="space-y-3">
                                {data.brand_takeaways?.map((tip, i) => (
                                    <li key={i} className="text-sm text-slate-700 flex items-start gap-2 leading-snug">
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-1" /> 
                                        <span>{tip}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Optimization</span>
                            <ul className="space-y-3">
                                {critique.missed_opportunities?.length > 0 ? (
                                    critique.missed_opportunities.map((opp, i) => (
                                        <li key={i} className="text-sm text-slate-700 flex items-start gap-2 leading-snug">
                                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-1" />
                                            <span>{opp}</span>
                                        </li>
                                    ))
                                ) : (
                                    <li className="text-sm text-slate-400 italic">No major issues found.</li>
                                )}
                            </ul>
                        </div>
                    </div>
                </Card>
            </div>

            {/* COLUMN 3: VISUAL STORYBOARD (Right) */}
            <div className="col-span-12 lg:col-span-4 h-[800px]">
                <Card title="Visual Storyboard" icon={Layers} className="h-full">
                    <VisualTimeline 
                        scenes={scenes} 
                        frames={frames}
                        videoDuration={videoDuration}
                        onJump={(time) => { 
                            if(videoRef.current) { 
                                videoRef.current.currentTime = parseTimestamp(time); 
                                videoRef.current.play(); 
                            }
                        }} 
                    />
                </Card>
            </div>

        </div>
      </div>
    </div>
  );
};

export default function DraperApp() {
  const [view, setView] = useState('upload'); 
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [previewFrames, setPreviewFrames] = useState([]);
  const [videoDuration, setVideoDuration] = useState(0);

  const handleFile = async (file) => {
    setView('loading');
    setVideoUrl(URL.createObjectURL(file));
    setProgress(10);
    try {
        const [extractResult, audio] = await Promise.all([
            extractFramesFromVideoFile(file, 8), 
            extractAudioFromVideo(file)
        ]);
        
        const frames = extractResult.frames || [];
        const duration = extractResult.duration || 0;

        setPreviewFrames(frames);
        setVideoDuration(duration);
        
        setProgress(40);
        const timer = setInterval(() => setProgress(p => Math.min(p + 5, 90)), 1000);
        
        const framesWithTime = frames.map((frame, index) => ({
            image: frame,
            timestamp: formatMinSec(index * (duration / frames.length)) 
        }));

        const response = await fetch('/api/analyze', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ framesWithTime, audio, duration }) 
        });
        
        clearInterval(timer); setProgress(100);
        
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Server Error: ${errText}`);
        }
        
        const result = await response.json();
        setAnalysisData(result);
        setTimeout(() => setView('report'), 500);
    } catch (e) { 
        console.error(e); 
        alert(`Analysis Failed: ${e.message}`); 
        setView('upload'); 
    }
  };

  const handleReset = () => { setVideoUrl(null); setAnalysisData(null); setView('upload'); };

  return <div className="font-sans text-slate-900 bg-slate-50 min-h-screen">{view === 'upload' && <UploadView onFileSelect={handleFile} />}{view === 'loading' && <LoadingView progress={progress} frames={previewFrames} />}{view === 'report' && <ReportView data={analysisData} videoUrl={videoUrl} onReset={handleReset} frames={previewFrames} videoDuration={videoDuration} />}</div>;
}
