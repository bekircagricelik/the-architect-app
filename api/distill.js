export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { transcript } = req.body;

  if (!transcript) {
    return res.status(400).json({ error: 'Transcript is required' });
  }

  const prompt = `You are The Architect's voice processor. A user just spoke their thoughts aloud, and you need to distill them into clear, written form.

Raw voice transcript:
"${transcript}"

Your task:
1. Remove all filler words (um, uh, like, you know, etc.)
2. Fix grammar and sentence structure
3. Preserve the user's authentic voice and meaning
4. Make it read naturally as a journal entry
5. Keep it concise but complete
6. Do NOT add content that wasn't there - only clarify what was said

Return ONLY the distilled text, nothing else.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [
          { role: "user", content: prompt }
        ],
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Distill API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
