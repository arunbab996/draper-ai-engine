require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const port = 3001;

app.use(express.json({ limit: '200mb' }));
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

    console.log(`[Draper] Processing ${framesToProcess.length} frames (Kannada Focus)...`);
    
    // 1. Audio Processing (DRAVIDIAN PRIORITY)
    const transcriptionPromise = (async () => {
        if (!audio) return "No audio detected.";
        try {
            tempAudioPath = saveTempAudioFile(audio);
            const transcription = await openai.audio.transcriptions.create({
                file: fs.createReadStream(tempAudioPath),
                model: "whisper-1",
                // CRITICAL FIX: Explicitly list Kannada first to prime the model
                prompt: "This audio is in Kannada, Tamil, or Telugu. Transcribe the specific regional language exactly." 
            });
            return transcription.text || "No spoken words.";
        } catch (err) {
            console.error("Audio Error:", err);
            return "Audio processing failed.";
        }
    })();
    
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
          
          1. LANGUAGE DETECTION:
             - The transcript is: "${transcriptionText}"
             - If the text looks/sounds like a Dravidian language (Kannada, Tamil, Telugu, Malayalam), label it ACCURATELY.
             - Do NOT default to Hindi. If unsure, say "South Indian Regional".
             
          2. CAMERA GEAR:
             - Vertical (9:16) = "Smartphone (UGC)" (Always).
             
          3. PLAYBOOK VOLUME:
             - "brand_takeaways": 6-8 distinct bullet points.
             - "missed_opportunities": 4-6 distinct bullet points.

          MANDATORY SECTIONS:
          1. CONTENT X-RAY: Ethnicity, Script, Text (Color/Style), Language, Audio.
          2. PRODUCTION SIGNALS: Camera Gear, Color Grade, Editing Pace.
          3. STRATEGY: Hook, Win, One-Liner.
          4. PLAYBOOK: Detailed lists.
          5. TIMELINE: 6-8 key moments.

          Return VALID JSON:
          {
            "meta": {
              "product_name": "string",
              "brand_name": "string",
              "industry_vertical": "string",
              "ad_type": "string",
              "quality_score": (1-10),
              "hero_insight": "string"
            },
            "content_xray": {
              "ethnicity": "string",
              "script": "string",
              "audio_desc": "string",
              "text_overlay": "string",
              "language": "string"
            },
            "production_analysis": {
              "camera_gear": "string",
              "color_grade": "string",
              "editing_pace": "string"
            },
            "creative_intelligence": {
              "creator_persona": "string",
              "visual_style": "string",
              "color_palette": ["#Hex1", "#Hex2", "#Hex3", "#Hex4"],
              "visual_density": "Minimalist / Balanced / Cluttered"
            },
            "communication_profile": {
              "voiceover_tone": "string",
              "cta_type": "string",
              "cta_text": "string",
              "psychological_triggers": ["Trigger 1", "Trigger 2"]
            },
            "strategy": {
              "one_liner": "string",
              "hook_tactic": "string",
              "winning_factor": "string"
            },
            "critique": {
              "missed_opportunities": ["Opp 1", "Opp 2", "Opp 3", "Opp 4"]
            },
            "brand_takeaways": ["Win 1", "Win 2", "Win 3", "Win 4", "Win 5", "Win 6"],
            "scene_by_scene": [
              { "timecode": "0:00", "segment": "Hook", "visual": "string", "audio": "string" }
            ]
          }`
        },
        {
          role: "user",
          content: framesToProcess.map(f => ({ 
              type: "image_url", 
              image_url: { url: f.image, detail: "low" } 
          }))
        },
        {
            role: "user",
            content: `Timestamps: ${framesToProcess.map(f => f.timestamp).join(", ")}. Map strictly.`
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

app.listen(port, () => console.log(`Draper Server running on http://localhost:${port}`));