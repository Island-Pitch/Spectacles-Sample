import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const OPENAI_BASE = "https://api.openai.com/v1";

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

    // Image generation endpoint
    if (subpath === "image") {
      const response = await fetch(`${OPENAI_BASE}/images/generations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: body.prompt,
          model: body.model || "dall-e-3",
          n: 1,
          response_format: "url",
        }),
      });

      const data = await response.json();
      const imageUrl = data?.data?.[0]?.url;
      const b64 = data?.data?.[0]?.b64_json;

      return {
        statusCode: response.status,
        headers: corsHeaders,
        body: JSON.stringify({ url: imageUrl, b64_json: b64 }),
      };
    }

    // Chat completion endpoint
    if (subpath === "chat") {
      const response = await fetch(`${OPENAI_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: body.model || "gpt-4o",
          messages: body.messages || [
            { role: "user", content: body.message },
          ],
          max_tokens: body.max_tokens || 1024,
        }),
      });

      const data = await response.json();

      return {
        statusCode: response.status,
        headers: corsHeaders,
        body: JSON.stringify({
          response: data?.choices?.[0]?.message?.content || "",
        }),
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
