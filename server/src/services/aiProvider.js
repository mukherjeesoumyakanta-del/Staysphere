/**
 * Provider-agnostic LLM client for StaySphere.
 * Supports Google Gemini and OpenAI / compatible endpoints.
 */

export function createAiClient({
  apiKey = process.env.AI_API_KEY || "",
  model = process.env.AI_MODEL || "gemini-1.5-flash",
  provider = process.env.AI_PROVIDER || "gemini",
} = {}) {
  const normProvider = (provider || "gemini").toLowerCase().trim();
  let cleanModel = (model || "").trim();
  if (
    !cleanModel ||
    cleanModel === "YOUR_CHOSEN_SUPPORTED_MODEL" ||
    cleanModel === "DEFAULT"
  ) {
    cleanModel = normProvider === "openai" ? "gpt-4o-mini" : "gemini-1.5-flash";
  }

  return {
    provider: normProvider,
    model: cleanModel,
    isConfigured() {
      return (
        typeof apiKey === "string" &&
        apiKey.trim().length > 0 &&
        !apiKey.includes("YOUR_")
      );
    },

    /**
     * Send a prompt to the configured LLM and return the string response.
     * @param {string} prompt
     * @param {object} options
     * @returns {Promise<{ text: string, provider: string, model: string }>}
     */
    async generateText(prompt, { maxTokens = 1000, temperature = 0.2 } = {}) {
      if (!this.isConfigured()) {
        throw new Error(
          "AI_API_KEY is not configured on this server. Please set AI_API_KEY in server/.env."
        );
      }

      const signal = AbortSignal.timeout(15000);

      if (normProvider === "gemini") {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          cleanModel
        )}:generateContent?key=${encodeURIComponent(apiKey)}`;

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
            },
          }),
          signal,
        });

        if (!response.ok) {
          const errBody = await response.text().catch(() => "");
          throw new Error(
            `Gemini API request failed (${response.status}): ${errBody || response.statusText}`
          );
        }

        const data = await response.json();
        const text =
          data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        return { text: text.trim(), provider: "gemini", model: cleanModel };
      }

      if (normProvider === "openai" || normProvider === "groq") {
        const endpoint =
          normProvider === "groq"
            ? "https://api.groq.com/openai/v1/chat/completions"
            : "https://api.openai.com/v1/chat/completions";

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: cleanModel,
            messages: [{ role: "user", content: prompt }],
            temperature,
            max_tokens: maxTokens,
          }),
          signal,
        });

        if (!response.ok) {
          const errBody = await response.text().catch(() => "");
          throw new Error(
            `OpenAI API request failed (${response.status}): ${errBody || response.statusText}`
          );
        }

        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content || "";
        return { text: text.trim(), provider: normProvider, model: cleanModel };
      }

      throw new Error(
        `Unsupported AI_PROVIDER: "${normProvider}". Supported providers: "gemini", "openai", "groq".`
      );
    },
  };
}
