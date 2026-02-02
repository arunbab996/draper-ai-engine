// api/audio.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const saveTempAudioFile = (base64Audio) => {
    const tempFilePath = path.join(os.tmpdir(), `upload_${Date.now()}.wav`);
    const base64Data = base64Audio.split(';base64,').pop();
    fs.writeFileSync(tempFilePath, base64Data, { encoding: 'base64' });
    return tempFilePath;
};

app.post('/api/audio', async (req, res) => {
    let tempAudioPath = null;
    try {
        const { audio } = req.body;
        if (!audio) return res.json({ error: "No audio" });

        console.log("[Draper] Audio Worker: Starting...");
        
        // 1. Transcribe
        tempAudioPath = saveTempAudioFile(audio);
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(tempAudioPath),
            model: "whisper-1",
            prompt: "The audio is in Kannada, Tamil, or Telugu. Transcribe the specific regional language exactly."
        });
        const text = transcription.text || "No spoken words.";

        // 2. Strategic Analysis (Based on Text)
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `Analyze this ad script for Strategy & Language.
                    Script: "${text}"
                    
                    *** RULES ***
                    1. LANGUAGE: Detect specific Dravidian languages (Kannada, Tamil, Telugu) if present.
                    2. PLAYBOOK: Generate 6-8 distinct "What Works" points and 4-6 "Missed Opps".

                    Return JSON:
                    {
                        "meta": { "product_name": "string", "brand_name": "string", "ad_type": "string", "quality_score": (1-10), "hero_insight": "string" },
                        "content_xray_audio": { "language": "string", "script": "string", "audio_desc": "string" },
                        "communication_profile": { "voiceover_tone": "string", "cta_type": "string", "cta_text": "string", "psychological_triggers": ["Trigger"] },
                        "strategy": { "one_liner": "string", "hook_tactic": "string", "winning_factor": "string" },
                        "critique": { "missed_opportunities": ["Point 1", "Point 2", "Point 3", "Point 4"] },
                        "brand_takeaways": ["Win 1", "Win 2", "Win 3", "Win 4", "Win 5", "Win 6"]
                    }`
                }
            ]
        });

        const jsonStr = completion.choices[0].message.content.replace(/```json|```/g, '').trim();
        res.json(JSON.parse(jsonStr));

    } catch (error) {
        console.error('Audio Worker Error:', error);
        res.status(500).json({ error: 'Audio analysis failed' });
    } finally {
        if (tempAudioPath && fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
    }
});

module.exports = app;
