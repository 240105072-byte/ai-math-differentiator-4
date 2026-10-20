
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Use POST method"
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Gemini API key is not configured"
    });
  }

  try {
    const { level, topic } = req.body || {};

    const allowedLevels = ["basic", "standard", "advanced"];

    if (!allowedLevels.includes(level)) {
      return res.status(400).json({
        error: "Choose a valid difficulty level"
      });
    }

    const safeTopic =
      typeof topic === "string"
        ? topic.slice(0, 100)
        : "Linear equations";

    const levelInstructions = {
      basic: "Use simple numbers, step-by-step guidance and a direct hint.",
      standard: "Use a grade-level problem with a clear solution and hint.",
      advanced: "Use a multi-step challenge, optionally with a real-world context."
    };

    const prompt = `
You are an educational mathematics tutor.

Topic: ${safeTopic}
Difficulty: ${level}
Instructions: ${levelInstructions[level]}

Generate one mathematically correct problem.

Return these sections:
Problem:
Hint:
Step-by-step solution:
Final answer:
Learning objective:

Use clear English. Check your calculations before responding.
Adapt the vocabulary and explanation to the selected level.
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-latest:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return res.status(502).json({
        error: "AI service request failed. Check server logs."
      });
    }

    const text =
      data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("\n") || "";

    if (!text) {
      return res.status(502).json({
        error: "AI returned no text. Please try again."
      });
    }

    return res.status(200).json({ result: text });

  } catch (error) {
    console.error("Generation error:", error);

    return res.status(500).json({
      error: "Could not generate a task. Please try again."
    });
  }
}
