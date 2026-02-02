// api/analyze.js
export const maxDuration = 60; // Tell Vercel to wait up to 60 seconds (requires Pro plan usually, but worth trying)
export const dynamic = 'force-dynamic';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();

// Increase payload limit to handle images + audio
app.use(express.json({ limit: '50mb' })); 
app.use(cors());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const saveTempAudioFile = (base64Audio) => {
    const tempFilePath = path.join(os.tmpdir(), `upload_${Date.now()}.wav`);
    const base64Data = base64Audio.split(';base64,').pop();
    fs.writeFileSync(tempFilePath, base64Data, { encoding: 'base64' });
    return tempFilePath;
};

app.post('/api/analyze', async (req, res) => {
  let tempAudioPath = null;
  try {
    const { frames, framesWithTime, audio, duration } = req.body; 
    
    // Normalize data input
    let framesToProcess = [];
    if (framesWithTime && framesWithTime.length > 0) {
        framesToProcess = framesWithTime;
    } else if (frames && frames.length > 0) {
        framesToProcess = frames.map((f, i) => ({ 
            image: f, 
            timestamp: duration ? `${Math.floor((i/frames.length)*duration)}s` : "0:00" 
        }));
    }

    if (framesToProcess.length === 0) return res.status(400).json({ error: 'No frames received' });

    console.log(`[Draper] Processing ${framesToProcess.length} frames...`);
    
    // 1. Audio Processing
    const transcriptionPromise = (async () => {
        if (!audio) return "No audio detected.";
        try {
            tempAudioPath = saveTempAudioFile(audio);
            const transcription = await openai.audio.transcriptions.create({
                file: fs.createReadStream(tempAudioPath),
                model: "whisper-1",
                prompt: "This audio is in Kannada, Tamil, or Telugu. Transcribe the specific regional language exactly." 
            });
            return transcription.text || "No spoken words.";
        } catch (err) {
            console.error("Audio Error:", err);
            return "Audio processing failed.";
        }
    })();
    
    // WAIT for audio before starting GPT to avoid parallel connection issues on Vercel
    const transcriptionText = await transcriptionPromise;

    // 2. Strategic Analysis
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are "Draper," a legendary Creative Director.
          Analyze this video ad based on the Visuals and Transcript ("${transcriptionText}").
          
          *** CRITICAL OVERRIDES ***
          1. LANGUAGE: Detect Dravidian languages (Kannada, Tamil, Telugu) accurately.
          2. GEAR: Vertical (9:16) = "Smartphone (UGC)".
          3. PLAYBOOK: 6-8 bullet points per section.

          Return VALID JSON:
          {
            "meta": { "product_name": "string", "brand_name": "string", "industry_vertical": "string", "ad_type": "string", "quality_score": (1-10), "hero_insight": "string" },
            "content_xray": { "ethnicity": "string", "script": "string", "audio_desc": "string", "text_overlay": "string", "language": "string" },
            "production_analysis": { "camera_gear": "string", "color_grade": "string", "editing_pace": "string" },
            "creative_intelligence": { "creator_persona": "string", "visual_style": "string", "color_palette": ["#Hex"], "visual_density": "Minimalist/Balanced/Cluttered" },
            "communication_profile": { "voiceover_tone": "string", "cta_type": "string", "cta_text": "string", "psychological_triggers": ["Trigger"] },
            "strategy": { "one_liner": "string", "hook_tactic": "string", "winning_factor": "string" },
            "critique": { "missed_opportunities": ["Point 1", "Point 2", "Point 3", "Point 4"] },
            "brand_takeaways": ["Win 1", "Win 2", "Win 3", "Win 4", "Win 5", "Win 6"],
            "scene_by_scene": [ { "timecode": "0:00", "segment": "Hook", "visual": "string", "audio": "string" } ]
          }`
        },
        {
          role: "user",
          content: framesToProcess.map(f => ({ type: "image_url", image_url: { url: f.image, detail: "low" } }))
        },
        {
            role: "user",
            content: `Timestamps: ${framesToProcess.map(f => f.timestamp).join(", ")}.`
        }
      ],
      max_tokens: 3500, 
    });

    const rawContent = completion.choices[0].message.content;
    const jsonStr = rawContent.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(jsonStr));

  } catch (error) {
    console.error('Analysis Error:', error);
    res.status(500).json({ error: error.message || 'Analysis failed' });
  } finally {
      if (tempAudioPath && fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
  }
});

module.exports = app;
