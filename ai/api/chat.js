// api/chat.js
export default async function handler(req, res) {
    // Mengambil key aman dari Environment Variables Vercel
    const API_KEY = process.env.GEMINI_API_KEY; 
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method tidak diizinkan' });
    }

    try {
        const { userText, systemPrompt } = req.body;

        // Hit langsung dari server internal Vercel ke Google Gemini
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    role: "user",
                    parts: [{ text: `${systemPrompt}\n\nPertanyaan user: ${userText}` }]
                }],
                generationConfig: { temperature: 0.1 }
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            return res.status(response.status).json({ error: data.error?.message || 'Gagal konek Gemini' });
        }

        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}