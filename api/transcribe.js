// api/transcribe.js
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

app.post('/api/transcribe', async (req, res) => {
    let tempAudioPath = null;
    try {
        const { audio } = req.body;
        if (!audio) return res.json({ text: "No audio detected." });

        console.log("[Draper] Transcribing audio...");
        tempAudioPath = saveTempAudioFile(audio);
        
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(tempAudioPath),
            model: "whisper-1",
            prompt: "The audio is in Kannada, Tamil, or Telugu. Transcribe exactly."
        });

        res.json({ text: transcription.text || "No spoken words." });

    } catch (error) {
        console.error('Transcription Error:', error);
        res.status(500).json({ error: 'Transcription failed' });
    } finally {
        if (tempAudioPath && fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
    }
});

module.exports = app;
