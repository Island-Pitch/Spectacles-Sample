import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const MESHY_API_KEY = process.env.MESHY_API_KEY!;
const MESHY_BASE_V2 = "https://api.meshy.ai/openapi/v2";
const MESHY_BASE_V1 = "https://api.meshy.ai/openapi/v1";

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

  const subpath = event.pathParameters?.proxy || "";

  // Route to appropriate Meshy endpoint
  let targetUrl: string;
  if (subpath.startsWith("image-to-3d")) {
    targetUrl = `${MESHY_BASE_V1}/${subpath}`;
  } else {
    targetUrl = `${MESHY_BASE_V2}/${subpath}`;
  }

  try {
    const response = await fetch(targetUrl, {
      method: event.httpMethod,
      headers: {
        Authorization: `Bearer ${MESHY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: event.body || undefined,
    });

    const data = await response.text();

    return {
      statusCode: response.status,
      headers: corsHeaders,
      body: data,
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
