import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import admin from "firebase-admin";

// ---------------------------------------------------------------------------
// Firebase Admin initialization (cached across warm invocations)
// ---------------------------------------------------------------------------
if (!admin.apps.length) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable is not set");
  }
  const serviceAccount = JSON.parse(serviceAccountJson);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const auth = admin.auth();

// ---------------------------------------------------------------------------
// AWS client initialization
// ---------------------------------------------------------------------------
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
});

// ---------------------------------------------------------------------------
// Code library cache (module-scope — survives warm Lambda invocations)
// ---------------------------------------------------------------------------
let codeLibraryCache = null;

async function loadCodeLibrary() {
  if (codeLibraryCache) {
    return codeLibraryCache;
  }

  // 1. Try bundled file first
  try {
    const { readFileSync } = await import("fs");
    const { fileURLToPath } = await import("url");
    const { dirname, join } = await import("path");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const data = readFileSync(join(__dirname, "code-library.json"), "utf-8");
    codeLibraryCache = JSON.parse(data);
    console.log("Code library loaded from bundled file");
    return codeLibraryCache;
  } catch {
    // bundled file not present — fall through to S3
  }

  // 2. Fall back to S3
  const bucket = process.env.CODE_LIBRARY_BUCKET;
  const key = process.env.CODE_LIBRARY_KEY || "code-library.json";

  if (!bucket) {
    throw new Error(
      "Code library not bundled and CODE_LIBRARY_BUCKET env var is not set"
    );
  }

  console.log(`Loading code library from S3: s3://${bucket}/${key}`);
  const response = await s3Client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key })
  );

  const bodyString = await streamToString(response.Body);
  codeLibraryCache = JSON.parse(bodyString);
  console.log("Code library loaded from S3");
  return codeLibraryCache;
}

function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    stream.on("error", reject);
  });
}

// ---------------------------------------------------------------------------
// Admin verification
// ---------------------------------------------------------------------------
async function verifyAdmin(idToken) {
  if (!idToken) {
    throw new AuthError("Missing authorization token");
  }

  let decodedToken;
  try {
    decodedToken = await auth.verifyIdToken(idToken);
  } catch (err) {
    throw new AuthError("Invalid or expired token: " + err.message);
  }

  const { uid } = decodedToken;
  const userDoc = await db.collection("users").doc(uid).get();

  if (!userDoc.exists) {
    throw new AuthError("User record not found");
  }

  const userData = userDoc.data();
  if (userData.role !== "admin") {
    throw new AuthError("Insufficient permissions — admin role required");
  }

  return { uid, userData };
}

class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthError";
  }
}

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------
function buildPrompt(codeLibrary, operativeNote) {
  const systemPrompt = `You are a medical coding specialist with expertise in cardiology procedure coding. Your task is to analyze operative notes from cardiac catheterization procedures and extract the appropriate CPT and ICD-10-CM codes.

## Code Library

${JSON.stringify(codeLibrary, null, 2)}

## Billing Rules

1. **CPT Code Selection**
   - Select the most specific CPT code(s) that accurately describe the procedure(s) performed.
   - Apply bundling rules: do not separately bill components already included in a comprehensive code.
   - Use add-on codes (+) only when the parent code is also billed.
   - For coronary angiography, identify whether left heart catheterization, right heart catheterization, or both were performed.
   - For interventions (PCI), identify each vessel and lesion treated separately when appropriate.
   - Vascular access codes (e.g., arterial/venous access) may be separately reportable depending on payer.

2. **ICD-10-CM Diagnosis Codes**
   - List the primary diagnosis first (the condition that drove the procedure).
   - Include secondary diagnoses that affected management (e.g., hypertension, diabetes, CKD stage).
   - Use the most specific code available (e.g., specify laterality, type, severity).
   - For CAD, specify native vs. bypass graft vessels and with/without angina.

3. **Modifier Rules**
   - Apply modifier -26 (professional component) or -TC (technical component) when appropriate.
   - Apply modifier -59 for distinct procedural services when necessary to prevent inappropriate bundling.
   - Apply modifier -LT / -RT for left/right distinctions.

4. **Output Format**
   Return ONLY valid JSON with the following structure — no prose, no markdown, no explanations outside the JSON:
   {
     "cpt_codes": [
       {
         "code": "string",
         "description": "string",
         "quantity": 1,
         "modifiers": [],
         "rationale": "string"
       }
     ],
     "icd10_codes": [
       {
         "code": "string",
         "description": "string",
         "type": "primary" | "secondary",
         "rationale": "string"
       }
     ],
     "notes": "string (optional — flag ambiguities or missing info)"
   }`;

  const userMessage = `Please extract all applicable CPT and ICD-10-CM codes from the following operative note:\n\n${operativeNote}`;

  return { systemPrompt, userMessage };
}

// ---------------------------------------------------------------------------
// CORS headers
// ---------------------------------------------------------------------------
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

// ---------------------------------------------------------------------------
// Parse Claude's response — handle optional markdown code fences
// ---------------------------------------------------------------------------
function parseClaudeResponse(rawText) {
  let text = rawText.trim();

  // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
  const fenceMatch = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  return JSON.parse(text);
}

// ---------------------------------------------------------------------------
// Lambda handler
// ---------------------------------------------------------------------------
export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS" || event.requestContext?.http?.method === "OPTIONS") {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: "",
    };
  }

  try {
    // --- Parse request body ---
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return jsonResponse(400, { error: "Invalid JSON in request body" });
    }

    const { operativeNote, image, imageType, idToken } = body;

    if ((!operativeNote || typeof operativeNote !== "string" || !operativeNote.trim()) && !image) {
      return jsonResponse(400, { error: "operativeNote or image is required" });
    }

    // --- Verify admin ---
    // --- Verify admin ---
    try {
      await verifyAdmin(idToken);
    } catch (err) {
      if (err instanceof AuthError) {
        return jsonResponse(401, { error: err.message });
      }
      throw err;
    }

    // --- Load code library ---
    const codeLibrary = await loadCodeLibrary();

    // --- Build prompt ---
    const { systemPrompt, userMessage } = buildPrompt(codeLibrary, operativeNote || "See attached image.");

    // --- Build user content (text, image, or both) ---
    const userContent = [];
    if (image) {
      userContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: imageType || "image/png",
          data: image,
        },
      });
    }
    userContent.push({
      type: "text",
      text: image
        ? "Extract billing codes from this operative note image." + (operativeNote ? `\n\nAdditional context:\n${operativeNote}` : "")
        : userMessage,
    });

    // --- Call Bedrock (Claude Sonnet) ---
    const modelId = "us.anthropic.claude-sonnet-4-20250514-v1:0";

    const bedrockPayload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userContent,
        },
      ],
    };

    const bedrockResponse = await bedrockClient.send(
      new InvokeModelCommand({
        modelId,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(bedrockPayload),
      })
    );

    const bedrockBody = JSON.parse(Buffer.from(bedrockResponse.body).toString("utf-8"));
    const rawText = bedrockBody?.content?.[0]?.text ?? "";

    if (!rawText) {
      return jsonResponse(502, { error: "Empty response from Bedrock" });
    }

    // --- Parse Claude's JSON response ---
    let extractedCodes;
    try {
      extractedCodes = parseClaudeResponse(rawText);
    } catch (parseErr) {
      console.error("Failed to parse Claude response as JSON:", rawText);
      return jsonResponse(502, {
        error: "Claude returned non-JSON response",
        raw: rawText,
      });
    }

    // --- Return results ---
    return jsonResponse(200, {
      success: true,
      data: extractedCodes,
    });
  } catch (err) {
    console.error("Unhandled error:", err);
    return jsonResponse(500, { error: "Internal server error" });
  }
};
