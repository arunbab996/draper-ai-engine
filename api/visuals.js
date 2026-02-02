// api/visuals.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/api/visuals', async (req, res) => {
  try {
    const { frames, framesWithTime, duration } = req.body; 
    
    // Normalize frames
    let framesToProcess = [];
    if (framesWithTime?.length > 0) framesToProcess = framesWithTime;
    else if (frames?.length > 0) {
        framesToProcess = frames.map((f, i) => ({ 
            image: f, 
            timestamp: duration ? `${Math.floor((i/frames.length)*duration)}s` : "0:00" 
        }));
    }

    if (framesToProcess.length === 0) return res.status(400).json({ error: 'No frames' });

    console.log(`[Draper] Visual Worker: Processing ${framesToProcess.length} frames...`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a Visual Analysis Engine.
          Analyze these video frames for Technical and Production signals ONLY.
          
          *** RULES ***
          1. GEAR: Vertical (9:16) = "Smartphone (UGC)". Horizontal/Cinema = "Pro".
          2. COLOR: Describe the grade (e.g., "Vibrant", "Muted", "B&W").
          3. SCENES: Break down the visual narrative.

          Return JSON:
          {
            "production_analysis": { "camera_gear": "string", "color_grade": "string", "editing_pace": "string" },
            "creative_intelligence": { "creator_persona": "string", "visual_style": "string", "color_palette": ["#Hex"], "visual_density": "string" },
            "content_xray_visuals": { "ethnicity": "string", "text_overlay": "string (visual description only)" },
            "scene_by_scene": [ { "timecode": "0:00", "segment": "Hook/Middle/End", "visual": "string" } ]
          }`
        },
        {
          role: "user",
          content: framesToProcess.map(f => ({ type: "image_url", image_url: { url: f.image, detail: "low" } }))
        },
        { role: "user", content: `Timestamps: ${framesToProcess.map(f => f.timestamp).join(", ")}` }
      ],
      max_tokens: 2000, 
    });

    const jsonStr = completion.choices[0].message.content.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(jsonStr));

  } catch (error) {
    console.error('Visual Worker Error:', error);
    res.status(500).json({ error: 'Visual analysis failed' });
  }
});

module.exports = app;
