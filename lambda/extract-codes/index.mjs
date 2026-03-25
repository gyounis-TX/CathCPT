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
   - For coronary angiography, identify whether left heart catheterization, right heart catheterization, or both were performed. ALWAYS include the diagnostic cath code (93451-93461) when PCI is performed.
   - Vascular access codes (e.g., arterial/venous access) may be separately reportable depending on payer.

   **CRITICAL — Multi-Vessel PCI Coding Rules:**
   - For PCI (stent, angioplasty, atherectomy), the FIRST vessel uses the BASE code:
     * 92928 = stent, first vessel
     * 92920 = PTCA (angioplasty without stent), first vessel
     * 92924 = atherectomy only, first vessel
     * 92933 = atherectomy + stent, first vessel
     * 92943 = CTO PCI, first vessel
   - Each ADDITIONAL vessel uses the corresponding ADD-ON code with modifier -59:
     * 92929-59 = stent, each additional vessel
     * 92921-59 = PTCA, each additional vessel
     * 92925-59 = atherectomy, each additional vessel
     * 92934-59 = atherectomy + stent, each additional vessel
     * 92944-59 = CTO, each additional vessel
   - NEVER use the base code (e.g., 92928) more than once. The second and third vessels MUST use the add-on code (e.g., 92929-59).
   - Example: 2-vessel PCI with stents = 92928 (first vessel) + 92929-59 (second vessel)
   - Example: 3-vessel PCI with stents = 92928 + 92929-59 + 92929-59

   **CRITICAL — Electrophysiology Coding Rules:**
   - **Diagnostic EP study**: 93619 (comprehensive, without induction) or 93620 (comprehensive, with induction). These are separately billable with ablation.
   - **SVT ablation**: 93653 (SVT ablation including AV nodal reentrant, accessory pathway). Bill 93619 or 93620 separately for the diagnostic EP component.
   - **Atrial flutter ablation**: 93650 (CTI/isthmus ablation for typical flutter). NOT 93655 (which is an add-on for additional ablation beyond primary).
   - **AFib ablation (PVI)**: 93656 (comprehensive PVI ablation). 93657 is add-on for additional ablation lines beyond PVI.
   - **VT ablation**: 93654 (comprehensive VT ablation with mapping).
   - **Pacemaker implant**: 33206 (single atrial), 33207 (single ventricular), 33208 (dual chamber). Choose based on number of leads placed.
   - **ICD implant**: 33249 (ICD with any leads including DFT testing).
   - **CRT-D**: Bill 33249 (ICD) + 33225 (LV lead placement via CS). The LV lead is always a separate add-on code.
   - **CRT-P (pacer)**: Bill 33208 (dual PPM) + 33225 (LV lead add-on).
   - **Lead extraction**: 33241 (laser/powered extraction requiring specialized equipment). 33233/33234/33235 are for simple traction removal without powered tools.
   - **DFT testing of existing ICD**: 93642 (includes VF induction and termination testing).
   - **Loop recorder**: 33285 (implant), 33286 (removal).
   - **Cardioversion**: 92960 (external), 92961 (internal).
   - **ICE (intracardiac echo)**: 93662 — separately billable add-on when used during EP or structural procedures.

2. **ICD-10-CM Diagnosis Codes**
   - List the primary diagnosis first (the condition that drove the procedure).
   - Include secondary diagnoses that affected management (e.g., hypertension, diabetes, CKD stage).
   - Use the most specific code available (e.g., specify laterality, type, severity).
   - For CAD, specify native vs. bypass graft vessels and with/without angina.

3. **Modifier Rules**
   - Apply modifier -26 (professional component) or -TC (technical component) when appropriate.
   - Apply modifier -59 for distinct procedural services when necessary to prevent inappropriate bundling.
   - Apply modifier -LT / -RT for left/right distinctions.

4. **Moderate Sedation Rules**
   - If the note mentions moderate sedation, conscious sedation, or sedation time, extract the total sedation time in minutes.
   - Do NOT include sedation CPT codes (99152, 99153) in the cpt_codes array — report sedation separately.
   - The billing system will automatically compute: 99152 for first 15 minutes, 99153 for each additional 15-minute unit.
   - Example: "30 minutes sedation" = sedation_minutes: 30 (system adds 99152 + 1x 99153).
   - Example: "15 minutes sedation" = sedation_minutes: 15 (system adds 99152 only).

5. **Output Format**
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
     "sedation_minutes": 0,
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

    const { operativeNote, image, imageType, idToken, mode, extractionResult, chatMessages } = body;

    // --- Chat mode ---
    if (mode === "chat") {
      if (!idToken) return jsonResponse(400, { error: "idToken is required" });
      try { await verifyAdmin(idToken); } catch (err) {
        if (err instanceof AuthError) return jsonResponse(401, { error: err.message });
        throw err;
      }

      if (!chatMessages || !Array.isArray(chatMessages) || chatMessages.length === 0) {
        return jsonResponse(400, { error: "chatMessages is required for chat mode" });
      }

      const codeLibrary = await loadCodeLibrary();
      const modelId = "us.anthropic.claude-sonnet-4-20250514-v1:0";

      const chatSystem = `You are an expert cardiology billing consultant. You have deep knowledge of CPT codes, ICD-10 codes, Medicare billing rules, NCCI edits, and modifier usage for interventional cardiology.

You are helping an admin review an AI-extracted billing analysis from a cardiac procedure operative note. Answer their questions about:
- Why specific codes were or weren't extracted
- Whether codes are appropriate for the documented procedure
- Modifier usage and NCCI compliance
- Medical necessity and documentation requirements
- Alternative coding approaches
- RVU and reimbursement implications

Be concise (1-2 paragraphs). Use plain text, not markdown. Reference specific CPT/ICD-10 codes when relevant.

CONTEXT — EXTRACTION RESULT:
${JSON.stringify(extractionResult || {})}

OPERATIVE NOTE:
${operativeNote || "(not provided)"}

CODE LIBRARY REFERENCE:
${JSON.stringify(codeLibrary.billingRules)}`;

      const messages = chatMessages.map(m => ({ role: m.role, content: m.content }));

      const chatPayload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1024,
        system: chatSystem,
        messages,
      };

      const chatResponse = await bedrockClient.send(
        new InvokeModelCommand({
          modelId,
          contentType: "application/json",
          accept: "application/json",
          body: JSON.stringify(chatPayload),
        })
      );

      const chatBody = JSON.parse(Buffer.from(chatResponse.body).toString("utf-8"));
      const reply = chatBody?.content?.[0]?.text ?? "";

      return jsonResponse(200, { reply });
    }

    if ((!operativeNote || typeof operativeNote !== "string" || !operativeNote.trim()) && !image) {
      return jsonResponse(400, { error: "operativeNote or image is required" });
    }

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
      const isPdf = (imageType || "").includes("pdf");
      userContent.push({
        type: isPdf ? "document" : "image",
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
        ? "Extract billing codes from this operative note. If this is a multi-page PDF, focus on the FIRST PAGE — it contains the procedure note with all billing-relevant information (procedure performed, findings, diagnosis, sedation time). Subsequent pages (ECGs, hemodynamic tracings, computer summaries) do not add new billing codes. Pay special attention to handwritten annotations — moderate sedation time is often written by hand near the bottom of the form. Report the total sedation time in sedation_minutes." + (operativeNote ? `\n\nAdditional context:\n${operativeNote}` : "")
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
