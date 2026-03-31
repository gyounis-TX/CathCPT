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

IMPORTANT: The SCAI (Society for Cardiovascular Angiography and Interventions) 2026 Billing Rules below are your PRIMARY and AUTHORITATIVE source for all coding decisions. When interpreting an operative note, apply SCAI rules first. Your general medical coding knowledge is secondary — if there is any conflict between your general knowledge and the SCAI rules, the SCAI rules govern. Do not invent codes or rules not covered by these guidelines. If a scenario is ambiguous, state the ambiguity in the "notes" field rather than guessing.

## Code Library

${JSON.stringify(codeLibrary, null, 2)}

## SCAI Billing Rules (2026)

### 1. CARDIAC CATHETERIZATION (93451-93461)
All cath codes include: catheter introduction/positioning, intracardiac/intravascular pressures, roadmapping angiography, catheter removal, access closure, imaging supervision/interpretation/report.
Right heart caths include: catheter placement in right-sided chambers, blood gas sampling, cardiac output. Do NOT include RV/RA angiography or pulmonary angiography.
Left heart caths include: catheter placement in left-sided chambers, LV/LA angiography with imaging S&I.

These codes are MUTUALLY EXCLUSIVE — choose exactly ONE:
- 93451 = Right heart cath only (with O2 sat and cardiac output)
- 93452 = Left heart cath only (with LV gram S&I)
- 93453 = Combined R+L heart cath (with LV gram S&I)
- 93454 = Coronary angiography only — WITHOUT left or right heart catheterization. Use ONLY when coronary/bypass angio is done without any heart cath.
- 93455 = Coronary angiography + bypass graft angiography — WITHOUT left or right heart cath. Use ONLY when coronary + graft angio is done without any heart cath.
- 93456 = Coronary angiography + right heart cath
- 93457 = Coronary angiography + bypass grafts + right heart cath
- 93458 = Coronary angiography + left heart cath/LV gram (MOST COMMON)
- 93459 = Coronary angiography + left heart cath + bypass grafts
- 93460 = Coronary angiography + combined R+L heart cath
- 93461 = Coronary angiography + combined R+L heart cath + bypass grafts
NEVER bill more than one. If LVEDP was measured → includes LHC → use 93458+. If grafts imaged → use graft variant. ALWAYS include one when PCI is performed.

Catheterization add-on codes (bill separately in addition to primary):
- 93462 = LHC by transseptal or transapical puncture (add-on to 93452-93461)
- 93463 = Pharmacologic agent administration with hemodynamics (add-on to 93451-93461)
- 93464 = Exercise study with hemodynamics (add-on to 93451-93461)
- 93566 = Selective RV or RA angiography (add-on to 93451, 93453, 93456-93461)
- 93567 = Supravalvular aortography (add-on to 93452-93461)
- 93568 = Pulmonary angiography (add-on to 93451, 93453, 93456-93461)
- 93571 = FFR/iFR initial vessel (add-on to cath or PCI codes; use coronary modifier)
- 93572 = FFR/iFR each additional vessel (add-on to 93571)

### 2. PCI — PERCUTANEOUS CORONARY INTERVENTION
All PCI codes include: accessing/catheterizing vessel, traversing lesion, radiologic S&I for intervention, arteriotomy closure through access sheath, distal embolic protection, imaging to document completion.

For a single artery or branch, use the code for the MOST INTENSIVE service performed.
Only ONE base code from the PCI family per major coronary artery and/or its branches.
If a lesion extends from one vessel into another and is bridged with a single intervention, report as ONE code.

**Coronary artery modifiers (required on PCI codes):**
- LC = Left circumflex (branches: obtuse marginal 1, obtuse marginal 2 — use add-on codes for branches)
- LD = Left anterior descending (branches: diagonal 1, diagonal 2 — use add-on codes for branches)
- LM = Left main (no recognized branches)
- RC = Right coronary (branches: posterior descending, posterolateral — use add-on codes for branches)
- RI = Ramus intermedius (no recognized branches)
Major coronary arteries = LM, LAD, LCx, RCA, Ramus. Use BASE codes for major arteries, ADD-ON codes for branches.

**Primary PCI codes (first vessel — use ONE):**
- 92920 = Angioplasty only (balloon, no stent)
- 92924 = Atherectomy (includes balloon angioplasty)
- 92928 = Stent placement, one lesion one or more segments (includes balloon). Report when one or more stents treat a single lesion.
- 92930 = Stent, 2+ distinct lesions with 2+ stents in 2+ segments, OR bifurcation lesion requiring stenting of both main + side branch
- 92933 = Atherectomy + stent (includes balloon)
- 92937 = Bypass graft PCI (any method — stent, atherectomy, angioplasty; includes distal protection)
- 92941 = Acute MI PCI (total/subtotal occlusion during acute MI; includes aspiration thrombectomy). NOT for non-emergent ACS or late-presenting NSTEMI without ongoing chest pain.
- 92943 = Chronic total occlusion PCI, antegrade approach (any combination stent/atherectomy/angioplasty)
- 92945 = CTO PCI, combined antegrade + retrograde approach
- 0913T = Drug-coated balloon (includes balloon angioplasty, IVUS/OCT imaging, coronary angiography)

**Add-on PCI codes (each additional vessel — with modifier -59):**
- 92921-59, 92925-59, 92929-59, 92931-59, 92934-59, 92938-59, 92944-59, 0914T
NEVER use a base code more than once. Additional vessels MUST use add-on codes.

**PCI add-on procedures (separately billable with any PCI):**
- 92972 = Coronary lithotripsy (IVL)
- 92973 = Mechanical aspiration thrombectomy (separately reportable with 92941)
- 92974 = Radiation delivery device (brachytherapy)
- 92978 = IVUS or OCT, initial vessel (report once per session; do NOT report with 0913T/0914T)
- 92979 = IVUS or OCT, each additional vessel (add-on to 92978; report once per additional vessel)

Report diagnostic angiography separately when: no prior study available and decision to intervene based on diagnostic angiography; or prior imaging inadequate/clinical change.

### 3. PERIPHERAL — LOWER EXTREMITY REVASCULARIZATION (2026)
LER codes include: access, selective catheterization, crossing lesion, treatment, imaging, closure.
Code per TERRITORY, not per lesion. Use the most complex service per territory.
Do NOT use add-on codes for additional lesions in the SAME vessel.
Interventions on each leg reported separately. Use modifier -50 on bilateral initial vessel codes.
Lesion types: Straightforward = stenosis; Complex = occlusion.

**Iliac Territory** (common iliac, internal iliac, external iliac):
Base codes: 37254, 37256, 37258, 37260 (initial artery)
Add-on codes: 37255, 37257, 37259, 37261 (up to 2 additional vessels per extremity)
Lithotripsy: 37262 (up to 3 times per leg)
Iliac atherectomy: 0238T

**Femoral/Popliteal Territory** (CFA, profunda, SFA, popliteal):
CFA + profunda = single vessel. SFA + popliteal = single vessel.
Base codes: 37263, 37265, 37267, 37269, 37271, 37273, 37275, 37277 (initial artery)
Add-on codes: 37264, 37266, 37268, 37270, 37272, 37274, 37276, 37278 (one additional vessel per extremity)
Lithotripsy: 37279 (up to 2 times per leg)

**Tibial/Peroneal Territory** (AT, PT, peroneal):
Tibioperoneal trunk = NOT a separate vessel unless only vessel treated.
Base codes: 37280, 37282, 37284, 37286, 37288, 37290, 37292, 37294 (initial artery)
Add-on codes: 37281, 37283, 37285, 37287, 37289, 37291, 37293, 37295 (up to 2 additional vessels per extremity)

**Inframalleolar Territory** (dorsalis pedis, plantar):
Pedal arch NOT a separate vessel unless only vessel treated.
Base codes: 37296, 37298 (initial artery)
Add-on codes: 37297, 37299 (one additional vessel per extremity)

### 4. STRUCTURAL HEART PROCEDURES

**TAVR/TAVI** (33361-33366): Requires two physician operators, modifier -62. Includes: percutaneous access, access sheath, balloon valvuloplasty, valve delivery/deployment, temp pacing, arteriotomy closure, angiography/fluoro S&I.
- 33361 = percutaneous femoral; 33362 = open femoral; 33363 = open axillary; 33364 = open iliac; 33365 = transaortic; 33366 = transapical
- 33370 = cerebral embolic protection (add-on to 33361-33366)
- 33368 = cardiopulmonary bypass support (add-on)
- Do NOT report diagnostic angiography done for roadmapping/fluoroscopic guidance, LVOT measurement, or post-TAVR aortic angiography.
- Report diagnostic angiography separately ONLY if no prior study available and intervention decision based on it.
- Report moderate sedation (99152) separately. Report US guidance (76937) separately if image saved. Report ICE (93662) separately.

**MitraClip/TEER** (33418-33419): 33418 = initial clip; 33419 = each additional clip (report once per session). 90-day global period.
- Includes: percutaneous access, sheath, transseptal puncture, device delivery/deployment, repositioning, closure.
- Do NOT report 0345T with R+L heart cath inherent to valve repair.
- Do NOT report diagnostic angiography done for TMVR guidance or hemodynamic measurements.
- Report ICE (93662) separately. Report moderate sedation separately.

**ASD/PFO Closure**: 93580 = ASD closure; 93581 = VSD closure. Report right heart cath and ICE separately.

**Watchman/LAA Closure**: 33340 = LAA closure. Report ICE (93662) separately. Report transseptal puncture separately if applicable.

**Tricuspid Valve** (0569T/0570T, 0545T, 0646T): Include vascular access, catheterization, device deployment, angiography/S&I, ICE. Similar diagnostic angiography rules as TAVR.

### 5. ELECTROPHYSIOLOGY
- **Diagnostic EP**: 93619 (without induction) or 93620 (with induction). Separately billable with ablation.
- **SVT ablation**: 93653. Bill diagnostic EP (93619/93620) separately.
- **AFlutter ablation**: 93650 (CTI ablation). 93655 = additional ablation add-on beyond primary.
- **AFib PVI**: 93656. 93657 = additional ablation lines add-on.
- **VT ablation**: 93654 (comprehensive with mapping).
- **Pacemaker**: 33206 (single atrial), 33207 (single ventricular), 33208 (dual chamber).
- **ICD**: 33249 (with any leads + DFT).
- **CRT-D**: 33249 + 33225 (LV lead add-on). **CRT-P**: 33208 + 33225.
- **Lead extraction**: 33241 (laser/powered). 33233/33234/33235 = simple traction.
- **DFT testing**: 93642. **Loop recorder**: 33285 (implant), 33286 (removal).
- **Cardioversion**: 92960 (external), 92961 (internal).
- **ICE**: 93662 (separately billable add-on).

### 6. ICD-10-CM DIAGNOSIS CODES
- Primary diagnosis first (condition driving the procedure).
- Include secondary diagnoses affecting management.
- Use most specific code (laterality, type, severity).
- CAD: specify native vs. graft, with/without angina.

### 7. MODIFIER RULES
- -26 / -TC = professional / technical component
- -59 = distinct procedural service (NCCI unbundling)
- -62 = two surgeons (required for TAVR)
- -LT / -RT = laterality
- -50 = bilateral (for peripheral initial vessel codes)
- LC/LD/LM/RC/RI = coronary artery modifiers (required on PCI codes)

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
