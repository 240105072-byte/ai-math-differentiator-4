
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST method" });
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

    const instructions = {
      basic: "Use simple numbers and explain each step clearly.",
      standard: "Use a grade-level problem with a hint and solution.",
      advanced: "Create a challenging multi-step problem."
    };

    const prompt = `
You are an educational mathematics tutor.
Topic: ${safeTopic}
Difficulty: ${level}
Instructions: ${instructions[level]}

Generate one mathematically correct problem in clear English.
Include these sections:
Problem:
Hint:
Step-by-step solution:
Final answer:
Learning objective:

Check all calculations before responding.
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            { parts: [{ text: prompt }] }
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

    const result =
      data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("\n") || "";

    if (!result) {
      console.error("Gemini returned no text:", data);
      return res.status(502).json({
        error: "AI returned no text. Please try again."
      });
    }

    return res.status(200).json({ result });

  } catch (error) {
    console.error("Generation error:", error);
    return res.status(500).json({
      error: "Could not generate a task. Please try again."
    });
  }
}

