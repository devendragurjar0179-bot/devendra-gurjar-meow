// PhishLens AI — synthetic phishing test suite
// Run: node --test phishing.test.js

import test from "node:test";
import assert from "node:assert/strict";

const TEST_CASES = [
  {
    id: "PH-001",
    category: "bank_phishing",
    channel: "sms",
    language: "en",
    expectedLabel: "phishing",
    message:
      "URGENT: Your bank account access will be suspended today. Verify your details to avoid restrictions.",
    indicators: ["urgency", "account_threat", "sensitive_information_request"],
  },
  {
    id: "PH-002",
    category: "kyc_phishing",
    channel: "sms",
    language: "en",
    expectedLabel: "phishing",
    message:
      "Your KYC verification is pending. Submit your banking information immediately to avoid account restrictions.",
    indicators: ["urgency", "sensitive_information_request"],
  },
  {
    id: "PH-003",
    category: "upi_scam",
    channel: "chat",
    language: "en",
    expectedLabel: "suspicious",
    message:
      "A stranger says I must enter my UPI PIN to receive a refund. Is this safe?",
    indicators: ["unsafe_payment_instruction"],
  },
  {
    id: "PH-004",
    category: "qr_phishing",
    channel: "chat",
    language: "en",
    expectedLabel: "suspicious",
    message:
      "Scan this QR code to claim a prize and sign in to your account.",
    indicators: ["unexpected_reward", "login_request"],
  },
  {
    id: "PH-005",
    category: "delivery_phishing",
    channel: "sms",
    language: "en",
    expectedLabel: "phishing",
    message:
      "Your parcel delivery has failed. Pay a small redelivery fee to arrange another delivery.",
    indicators: ["unexpected_payment", "delivery_premise"],
  },
  {
    id: "PH-006",
    category: "email_phishing",
    channel: "email",
    language: "en",
    expectedLabel: "phishing",
    message:
      "Your mailbox will be disabled. Confirm your password immediately to restore access.",
    indicators: ["urgency", "password_request", "account_threat"],
  },
  {
    id: "PH-007",
    category: "government_impersonation",
    channel: "sms",
    language: "en",
    expectedLabel: "phishing",
    message:
      "Your tax refund is ready. Provide your bank credentials and OTP to release the payment.",
    indicators: ["impersonation_claim", "credential_request", "otp_request"],
  },
  {
    id: "PH-008",
    category: "job_scam",
    channel: "chat",
    language: "en",
    expectedLabel: "suspicious",
    message:
      "Earn ₹5,000 daily by liking videos. Pay a refundable registration deposit before starting.",
    indicators: ["unrealistic_earnings", "upfront_fee"],
  },
  {
    id: "PH-009",
    category: "scholarship_scam",
    channel: "email",
    language: "en",
    expectedLabel: "suspicious",
    message:
      "You have been selected for a student scholarship. Pay a processing fee today to unlock your award.",
    indicators: ["unexpected_award", "upfront_fee"],
  },
  {
    id: "PH-010",
    category: "electricity_scam",
    channel: "sms",
    language: "en",
    expectedLabel: "phishing",
    message:
      "Your electricity connection will be disconnected tonight. Pay immediately using the payment instructions in this message.",
    indicators: ["urgency", "threat", "payment_pressure"],
  },
  {
    id: "PH-011",
    category: "social_media_phishing",
    channel: "chat",
    language: "en",
    expectedLabel: "phishing",
    message:
      "Your social media account violated our policies. Enter your password on the linked page to appeal.",
    indicators: ["account_threat", "password_request"],
  },
  {
    id: "PH-012",
    category: "tech_support_scam",
    channel: "phone",
    language: "en",
    expectedLabel: "suspicious",
    message:
      "An unverified support caller says my computer is infected and asks for my password and remote access.",
    indicators: ["unverified_identity", "password_request", "excessive_access"],
  },
  {
    id: "PH-013",
    category: "spear_phishing",
    channel: "email",
    language: "en",
    expectedLabel: "suspicious",
    message:
      "A message using my name and college details asks me to sign in to view an urgent document.",
    indicators: ["personalization", "login_request", "urgency"],
  },
  {
    id: "PH-014",
    category: "business_email_compromise",
    channel: "email",
    language: "en",
    expectedLabel: "suspicious",
    message:
      "A message appearing to come from a company director requests a confidential bank transfer and says not to contact anyone.",
    indicators: ["authority_pressure", "financial_request", "secrecy"],
  },
  {
    id: "PH-015",
    category: "hindi_english_kyc",
    channel: "sms",
    language: "hi-en",
    expectedLabel: "phishing",
    message:
      "Aapka bank KYC aaj expire ho raha hai. Account block hone se bachane ke liye apna OTP aur password bhejein.",
    indicators: [
      "urgency",
      "account_threat",
      "otp_request",
      "password_request",
    ],
  },
  {
    id: "PH-016",
    category: "benign_bank_notice",
    channel: "app_notice",
    language: "en",
    expectedLabel: "likely_legitimate",
    message:
      "Your monthly bank statement is available in your banking app. Open the app directly to view it.",
    indicators: [],
  },
  {
    id: "PH-017",
    category: "benign_college_notice",
    channel: "email",
    language: "en",
    expectedLabel: "likely_legitimate",
    message:
      "The examination timetable is available on the student portal you normally use. Please check the college notice board for updates.",
    indicators: [],
  },
  {
    id: "PH-018",
    category: "benign_delivery_update",
    channel: "app_notice",
    language: "en",
    expectedLabel: "likely_legitimate",
    message:
      "Your parcel is out for delivery today. Check its status in the courier's official app.",
    indicators: [],
  },
  {
    id: "PH-019",
    category: "ambiguous_urgent_notice",
    channel: "sms",
    language: "en",
    expectedLabel: "suspicious",
    message:
      "Please review your account notice today. For your security, open your usual banking app yourself.",
    indicators: ["urgency"],
  },
  {
    id: "PH-020",
    category: "empty_input",
    channel: "text",
    language: "en",
    expectedLabel: "invalid_input",
    message: "",
    indicators: [],
  },
];

const ALLOWED_LABELS = new Set([
  "phishing",
  "suspicious",
  "likely_legitimate",
  "invalid_input",
]);

function validatePrediction(prediction) {
  assert.ok(
    prediction && typeof prediction === "object",
    "prediction must be an object"
  );

  assert.ok(
    ALLOWED_LABELS.has(prediction.label),
    `unexpected label: ${prediction.label}`
  );

  assert.ok(
    Array.isArray(prediction.evidence),
    "evidence must be an array"
  );

  assert.ok(
    typeof prediction.explanation === "string",
    "explanation must be a string"
  );

  assert.ok(
    typeof prediction.safeNextSteps === "string" ||
      Array.isArray(prediction.safeNextSteps),
    "safeNextSteps must be a string or array"
  );

  return true;
}

function calculateMetrics(rows) {
  // Phishing is the positive class.
  // Suspicious cases are excluded from these binary metrics.

  const scored = rows.filter(
    (r) =>
      r.expectedLabel === "phishing" ||
      r.expectedLabel === "likely_legitimate"
  );

  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;

  for (const row of scored) {
    const actualPositive = row.expectedLabel === "phishing";
    const predictedPositive = row.predictedLabel === "phishing";

    if (actualPositive && predictedPositive) {
      tp++;
    } else if (!actualPositive && predictedPositive) {
      fp++;
    } else if (!actualPositive && !predictedPositive) {
      tn++;
    } else {
      fn++;
    }
  }

  const ratio = (a, b) => (b === 0 ? null : a / b);

  const precision = ratio(tp, tp + fp);
  const recall = ratio(tp, tp + fn);
  const specificity = ratio(tn, tn + fp);

  const f1 =
    precision === null ||
    recall === null ||
    precision + recall === 0
      ? null
      : (2 * precision * recall) / (precision + recall);

  return {
    sampleCount: scored.length,
    tp,
    fp,
    tn,
    fn,
    precision,
    recall,
    specificity,
    f1,
  };
}

// Connect this adapter to your Express endpoint.
// Assumed request: POST { "text": "..." }
// Assumed response:
// {
//   "label": "phishing",
//   "evidence": [],
//   "explanation": "...",
//   "safeNextSteps": []
// }

async function callModel(message) {
  const apiUrl = process.env.PHISHLENS_API_URL;

  if (!apiUrl) {
    throw new Error(
      "Set PHISHLENS_API_URL to your running PhishLens analysis endpoint."
    );
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ text: message }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(
      `PhishLens API returned HTTP ${response.status}`
    );
  }

  const body = await response.json();

  return {
    label: body.label,
    evidence: body.evidence,
    explanation: body.explanation,
    safeNextSteps: body.safeNextSteps,
  };
}

// Test 1: Dataset structure and unique IDs.

test("test dataset has unique IDs and valid expected labels", () => {
  const ids = TEST_CASES.map((item) => item.id);

  assert.equal(
    new Set(ids).size,
    ids.length,
    "test case IDs must be unique"
  );

  for (const item of TEST_CASES) {
    assert.ok(item.id);
    assert.ok(item.category);

    assert.ok(
      [
        "phishing",
        "suspicious",
        "likely_legitimate",
        "invalid_input",
      ].includes(item.expectedLabel)
    );

    assert.ok(typeof item.message === "string");
    assert.ok(Array.isArray(item.indicators));
  }
});

// Test 2: Dataset coverage.

test("dataset includes phishing, ambiguous, benign, and empty-input cases", () => {
  const labels = new Set(
    TEST_CASES.map((item) => item.expectedLabel)
  );

  assert.ok(labels.has("phishing"));
  assert.ok(labels.has("suspicious"));
  assert.ok(labels.has("likely_legitimate"));
  assert.ok(labels.has("invalid_input"));
});

// Test 3: Metric calculation.

test("metric calculation returns expected values on a known example", () => {
  const result = calculateMetrics([
    {
      expectedLabel: "phishing",
      predictedLabel: "phishing",
    },
    {
      expectedLabel: "phishing",
      predictedLabel: "likely_legitimate",
    },
    {
      expectedLabel: "likely_legitimate",
      predictedLabel: "phishing",
    },
    {
      expectedLabel: "likely_legitimate",
      predictedLabel: "likely_legitimate",
    },
  ]);

  assert.equal(result.tp, 1);
  assert.equal(result.fn, 1);
  assert.equal(result.fp, 1);
  assert.equal(result.tn, 1);

  assert.equal(result.precision, 0.5);
  assert.equal(result.recall, 0.5);
  assert.equal(result.specificity, 0.5);
  assert.equal(result.f1, 0.5);
});

// Test 4: Run test messages against the actual API.

test(
  "model API returns a valid result for each non-empty synthetic case",
  {
    skip: !process.env.PHISHLENS_API_URL
      ? "Set PHISHLENS_API_URL to run live API tests"
      : false,
  },
  async (t) => {
    for (const item of TEST_CASES.filter(
      (c) => c.message.trim().length > 0
    )) {
      await t.test(
        `${item.id} ${item.category}`,
        async () => {
          const prediction = await callModel(item.message);

          validatePrediction(prediction);

          // Disagreements are logged for review rather than
          // automatically failing every model prediction.

          const matches =
            prediction.label === item.expectedLabel;

          console.log(
            JSON.stringify({
              id: item.id,
              category: item.category,
              expected: item.expectedLabel,
              predicted: prediction.label,
              matches,
              evidence: prediction.evidence,
            })
          );
        }
      );
    }
  }
);

// Test 5: Empty input handling.

test(
  "empty input is rejected or explicitly classified as invalid",
  {
    skip: !process.env.PHISHLENS_API_URL
      ? "Set PHISHLENS_API_URL to run live API tests"
      : false,
  },
  async () => {
    await assert.rejects(
      () => callModel(""),
      (error) => {
        // This passes if the API rejects empty input with a non-2xx status.
        // If the API returns { label: "invalid_input" },
        // adapt this test to validate that response instead.

        return error instanceof Error;
      }
    );
  }
);

export {
  TEST_CASES,
  calculateMetrics,
  validatePrediction,
};