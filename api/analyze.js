// api/analyze.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/api/analyze', async (req, res) => {
  try {
    // receiving 'transcript' directly from frontend now
    const { frames, framesWithTime, transcript, duration } = req.body; 
    
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

    console.log(`[Draper] Analyzing ${framesToProcess.length} frames with transcript...`);
    
    // 2. Strategic Analysis (Audio is already done!)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are "Draper," a legendary Creative Director.
          Analyze this video ad based on the Visuals and Transcript ("${transcript}").
          
          *** CRITICAL OVERRIDES ***
          1. LANGUAGE: Detect Dravidian languages (Kannada, Tamil, Telugu) accurately based on the transcript provided.
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
  }
});

module.exports = app;
