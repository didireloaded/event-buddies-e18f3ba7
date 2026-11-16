import { test } from "node:test";
import assert from "node:assert/strict";
import { secretCategory } from "./check-client-secrets.mjs";

function jwt(role) {
  return `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.fixture`;
}

test("public Supabase configuration is allowed", () => {
  assert.equal(secretCategory(`VITE_SUPABASE_ANON_KEY=${jwt("anon")}`), null);
  assert.equal(secretCategory("VITE_SUPABASE_URL=https://example.supabase.co"), null);
});
test("service-role JWT is detected without returning its value", () => {
  const token = jwt("service_role");
  assert.equal(secretCategory(token), "service-role JWT");
});
test("private VITE names and supported private key formats are rejected", () => {
  assert.ok(secretCategory("VITE_SUPABASE_SERVICE_ROLE_KEY=fixture"));
  assert.ok(secretCategory("VITE_LOVABLE_API_KEY=fixture"));
  assert.ok(secretCategory("sb_secret_" + "fixture".repeat(4)));
  assert.ok(secretCategory("-----BEGIN PRIVATE KEY-----"));
});
