# PhishLens AI — Phishing Types Covered by Our Model

**Project:** PhishLens AI  
**Purpose:** Document the phishing and scam categories included in our synthetic test suite.  
**Scope:** Defensive testing and model evaluation using fictional messages. These categories are test scenarios, not claims that every message in a category is malicious.

## 1. Categories included in the current JavaScript test suite

The current `phishing.test.js` dataset contains 20 test cases, including phishing/suspicious scenarios, likely-legitimate or ambiguous scenarios, and one empty-input validation case. The category names below match the dataset's `category` field.

| # | Category ID | Type / scenario | Test channel | Expected label |
|---:|---|---|---|---|
| 1 | `bank_phishing` | Bank impersonation or account-restriction message | SMS | `phishing` |
| 2 | `kyc_phishing` | KYC verification pressure and request for banking information | SMS | `phishing` |
| 3 | `upi_scam` | Unsafe UPI PIN instruction associated with a refund | Chat | `suspicious` |
| 4 | `qr_phishing` | QR-code prize claim that requests account sign-in | Chat text representing a QR scenario | `suspicious` |
| 5 | `delivery_phishing` | Parcel redelivery fee request | SMS | `phishing` |
| 6 | `email_phishing` | Mailbox-disable threat and password request | Email | `phishing` |
| 7 | `government_impersonation` | Fake tax-refund message requesting bank credentials and OTP | SMS | `phishing` |
| 8 | `job_scam` | High-earning job claim requiring an upfront deposit | Chat | `suspicious` |
| 9 | `scholarship_scam` | Scholarship award requiring a processing fee | Email | `suspicious` |
| 10 | `electricity_scam` | Electricity-disconnection threat with urgent payment instructions | SMS | `phishing` |
| 11 | `social_media_phishing` | Social account policy threat and password request | Chat | `phishing` |
| 12 | `tech_support_scam` | Unverified support caller requests password and remote access | Phone scenario represented as text | `suspicious` |
| 13 | `spear_phishing` | Personalized message using a person's name/college details to prompt sign-in | Email | `suspicious` |
| 14 | `business_email_compromise` | Apparent company director requests a confidential bank transfer | Email | `suspicious` |
| 15 | `hindi_english_kyc` | Hindi-English KYC message requesting OTP and password | SMS | `phishing` |
| 16 | `benign_bank_notice` | Routine bank-statement notice directing the user to open their app directly | App notice | `likely_legitimate` |
| 17 | `benign_college_notice` | Routine examination timetable notice | Email | `likely_legitimate` |
| 18 | `benign_delivery_update` | Routine parcel delivery update directing the user to the courier app | App notice | `likely_legitimate` |
| 19 | `ambiguous_urgent_notice` | Account notice with mild urgency but advises opening the usual banking app directly | SMS | `suspicious` |
| 20 | `empty_input` | Empty message validation test | Text input | `invalid_input` |

## 2. Broader phishing techniques represented

Some test categories overlap. For example, a KYC message can be both SMS phishing (*smishing*) and bank impersonation. The current suite represents these techniques or related scam patterns:

- **Bank phishing:** impersonation of a bank or a warning about account restrictions.
- **KYC phishing:** pressure to update customer verification details.
- **UPI/payment scam:** unsafe instructions involving UPI PINs or refunds.
- **QR-code phishing (quishing):** a QR-related scenario that requests sign-in.
- **SMS phishing (smishing):** phishing-like content delivered by SMS.
- **Email phishing:** fraudulent email content requesting credentials or urgent action.
- **Government impersonation:** a tax-refund claim used to request sensitive data.
- **Delivery phishing:** parcel or redelivery-fee scenarios.
- **Electricity-payment scam:** disconnection threats paired with payment pressure.
- **Social-media phishing:** account-policy threats used to request passwords.
- **Tech-support scam:** unverified support identity requesting sensitive access.
- **Job and task scams:** unrealistic earnings and upfront deposits.
- **Scholarship scams:** unexpected awards and processing-fee requests.
- **Spear phishing:** personalized targeting.
- **Business Email Compromise (BEC) / executive impersonation:** requests for confidential financial transfers.
- **Hindi-English phishing:** code-switched Hindi-English wording to test language robustness.

**Important distinction:** The dataset does not yet contain dedicated live voice-call analysis, real QR image decoding tests, whaling-specific test cases, romance-scam cases, or real URL/domain reputation checks. The tech-support phone scenario is currently represented as text. QR-related coverage is currently a text test case; image-decoding behavior should be tested separately with generated dummy QR images.

## 3. Labels used by the model test suite

| Label | Meaning in testing |
|---|---|
| `phishing` | The synthetic example is expected to contain strong phishing indicators. |
| `suspicious` | The example needs caution or additional context; it is not a definitive malicious verdict. |
| `likely_legitimate` | The synthetic example is expected to look routine and not request sensitive information. This does not prove a real sender or message is genuine. |
| `invalid_input` | The input is empty or invalid and should be rejected or handled explicitly. |

## 4. Evidence the model should identify

Depending on the example, useful evidence includes:

- Urgency, threats, or pressure to act immediately.
- Requests for passwords, OTPs, UPI PINs, or banking credentials.
- Unexpected payments, deposits, or refund instructions.
- Claims of prizes, refunds, jobs, or scholarships that require payment or sensitive information.
- Requests for secrecy or unusual financial transfers.
- Unverified sender identity or impersonation claims.
- Login requests in unexpected contexts.
- Hindi-English wording and spelling variations.

The model should cite evidence actually present in the input. A suspicious-sounding word, unfamiliar URL, or brand name alone is not proof of phishing.

## 5. Test channels supported by the current project plan

- **Text:** paste a message for analysis.
- **Screenshot:** analyze a screenshot containing a suspicious message.
- **QR image:** decode locally and show the decoded destination as inert text. Do not open or automatically navigate to it.

The current JavaScript test suite primarily sends text examples to the API. Screenshot and QR-image flows need separate integration tests to validate image upload, OCR/visual analysis, QR decoding, invalid file handling, and the rule that scanned destinations are never opened automatically.

## 6. Recommended future additions

To broaden coverage, consider adding clearly labeled synthetic tests for:

1. Whaling / senior-executive targeting.
2. Romance or trust-based financial manipulation.
3. Fake customer-care numbers and search-result impersonation.
4. Account-recovery and password-reset scams.
5. Fake payment screenshots and payment-confirmation claims.
6. Malicious attachment or document-delivery lures.
7. QR image decoding and malformed QR inputs.
8. Screenshot tests with different fonts, layouts, and Hindi-English text.
9. Benign messages that contain urgent wording, to measure false positives.
10. Non-English messages and ambiguous cases.

Keep all examples fictional, use reserved/example destinations or local test fixtures, and never include real personal information, active malicious links, or genuine credentials.

## 7. Evaluation notes

Use a held-out test set to measure precision, recall, F1 score, and false-positive rate. Review model evidence and safe next steps as well as the predicted label. Treat `suspicious` as a review category rather than silently counting it as either definitely phishing or definitely legitimate.

**Project limitation:** The model's output is probabilistic guidance, not a security verdict. Unless a separately disclosed reputation service is implemented, the model does not independently verify URLs, domains, senders, or phone numbers.
