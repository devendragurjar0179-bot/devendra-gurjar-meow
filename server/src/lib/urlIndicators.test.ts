import test from "node:test";
import assert from "node:assert/strict";
import { inspectPayload } from "./urlIndicators.js";

test("recognizes a normal HTTPS URL without declaring it safe", () => {
  const result = inspectPayload("https://example.com");
  assert.equal(result.payloadType, "HTTP(S) URL");
  assert.ok(result.observations.some((item) => item.includes("does not establish safety")));
});

test("flags HTTP as an observation, not a verdict", () => {
  const result = inspectPayload("http://example.com/login");
  assert.ok(result.observations.some((item) => item.includes("HTTP rather than HTTPS")));
});

test("treats non-URL text as a payload", () => {
  const result = inspectPayload("hello world");
  assert.equal(result.payloadType, "Plain text or non-URL payload");
});

test("flags URL user-info", () => {
  const result = inspectPayload("https://example.com@evil.test/login");
  assert.ok(result.observations.some((item) => item.includes("user-info")));
});
