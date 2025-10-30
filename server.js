import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('.'));

app.post('/api/responses', async (req, res) => {
  try {
    console.log('Received input:', req.body);
    if (!OPENAI_API_KEY) {
      res.status(500).json({ error: 'Missing OPENAI_API_KEY on server' });
      return;
    }

    let { model, messages, input, temperature, top_p } = req.body;
    // Accept both 'messages' (OpenAI chat completions format) and 'input' (former custom format)
    const arr = Array.isArray(messages) ? messages : Array.isArray(input) ? input : [];
    const msgs = arr.filter(m => m && m.role && typeof m.content === 'string' && m.content.trim().length > 0)
                   .map(m => ({ role: m.role, content: m.content }));

    if (!msgs.length) {
      res.status(400).json({ error: "No valid messages provided (need at least user or system message with content)" });
      return;
    }
    model = model || 'gpt-3.5-turbo';
    if (!model.startsWith('gpt')) model = 'gpt-3.5-turbo';

    // No streaming: request a single reply whole
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages: msgs,
        stream: false,
        temperature,
        top_p
      })
    });

    if (!upstream.ok) {
      const errorText = await upstream.text();
      console.error('OpenAI API error:', upstream.status, errorText);
      res.status(upstream.status).send(errorText);
      return;
    }

    // Simply forward JSON
    const json = await upstream.json();
    res.status(upstream.status).json(json);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Proxy error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


