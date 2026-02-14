import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Content-Type": "application/json",
};

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const subpath = event.pathParameters?.proxy || "";

    // Chat endpoint — used by Scene Orchestrator
    if (subpath === "chat") {
      const model = "gemini-2.0-flash";
      const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

      const contents = [];
      if (body.systemPrompt) {
        contents.push({
          role: "user",
          parts: [{ text: body.systemPrompt + "\n\n" + body.message }],
        });
      } else {
        contents.push({
          role: "user",
          parts: [{ text: body.message }],
        });
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents }),
      });

      const data = await response.json();
      const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ response: text }),
      };
    }

    // Image generation endpoint
    if (subpath === "image") {
      const model = "gemini-2.0-flash-preview-image-generation";
      const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: body.prompt }] },
          ],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        }),
      });

      const data = await response.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find(
        (p: { inlineData?: { data: string } }) => p.inlineData
      );

      if (imagePart) {
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ base64: imagePart.inlineData.data }),
        };
      }

      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "No image generated" }),
      };
    }

    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: `Unknown endpoint: ${subpath}` }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Proxy error",
      }),
    };
  }
}
