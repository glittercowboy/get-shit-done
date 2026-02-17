const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const GSD_TOOLS = path.join(__dirname, "gsd-tools.cjs");
const CWD = path.resolve(__dirname, "..", "..");

function run(args) {
  return execSync(`node ${GSD_TOOLS} ${args}`, {
    cwd: CWD,
    encoding: "utf-8",
    timeout: 15000,
  });
}

function runJSON(args) {
  const out = run(args);
  // Handle @file: prefix for large payloads
  if (out.startsWith("@file:")) {
    const filePath = out.slice(6).trim();
    const content = fs.readFileSync(filePath, "utf-8");
    fs.unlinkSync(filePath);
    return JSON.parse(content);
  }
  return JSON.parse(out);
}

// ─── Metrics Engine Tests ─────────────────────────────────────────────────────

describe("metrics", () => {
  describe("project slug derivation", () => {
    it("should derive correct slug for this repo", () => {
      const result = runJSON("metrics project");
      assert.equal(result.slug, "-Users-stevo-Sites-get-shit-done");
    });
  });

  describe("metrics project", () => {
    it("should return totals with token breakdown", () => {
      const result = runJSON("metrics project");
      assert.ok(result.totals, "should have totals");
      assert.ok(result.totals.api_calls > 0, "should have API calls");
      assert.ok(result.totals.tokens, "should have tokens object");
      assert.ok(result.totals.tokens.total > 0, "total tokens > 0");
      assert.ok(result.totals.tokens.cache_read > 0, "cache_read > 0");
      assert.ok(result.totals.tokens.new_work > 0, "new_work > 0");
    });

    it("should include efficiency metrics", () => {
      const result = runJSON("metrics project");
      assert.ok(result.totals.efficiency, "should have efficiency");
      assert.ok(result.totals.efficiency.cache_ratio > 0, "cache_ratio > 0");
      assert.ok(result.totals.efficiency.new_work_pct > 0, "new_work_pct > 0");
      assert.ok(
        result.totals.efficiency.new_work_pct < 100,
        "new_work_pct < 100",
      );
    });

    it("should include model breakdown", () => {
      const result = runJSON("metrics project");
      assert.ok(result.totals.models, "should have models");
      // At least one model should be present
      const modelNames = Object.keys(result.totals.models);
      assert.ok(modelNames.length > 0, "should have at least one model");

      for (const model of modelNames) {
        assert.ok(
          result.totals.models[model].calls > 0,
          `${model} should have calls`,
        );
        assert.ok(
          typeof result.totals.models[model].pct === "number",
          `${model} should have pct`,
        );
      }
    });

    it("should report session log directory", () => {
      const result = runJSON("metrics project");
      assert.ok(result.session_log_dir, "should have session_log_dir");
      assert.ok(result.total_log_entries > 0, "should have log entries");
    });

    it("new_work should equal input + output + cache_create", () => {
      const result = runJSON("metrics project");
      const t = result.totals.tokens;
      assert.equal(
        t.new_work,
        t.input + t.output + t.cache_create,
        "new_work = input + output + cache_create",
      );
    });

    it("total should equal input + output + cache_read + cache_create", () => {
      const result = runJSON("metrics project");
      const t = result.totals.tokens;
      assert.equal(
        t.total,
        t.input + t.output + t.cache_read + t.cache_create,
        "total = input + output + cache_read + cache_create",
      );
    });
  });

  describe("metrics milestone", () => {
    it("should return error or data depending on repo state", () => {
      const result = runJSON("metrics milestone");
      // This repo has no .planning/phases, so we expect an error
      assert.ok(result.error || result.totals, "should have error or totals");
      if (result.error) {
        assert.ok(
          result.error.includes("boundar") || result.error.includes("found"),
          "error should mention boundaries or not found",
        );
      }
    });
  });

  describe("metrics phase", () => {
    it("should return zero results for non-existent phase", () => {
      const result = runJSON("metrics phase 99");
      // Phase 99 has no commits, so returns empty aggregate or error
      assert.ok(
        result.api_calls === 0 || result.error,
        "should have zero calls or error for missing phase",
      );
    });
  });
});

// ─── Existing Command Smoke Tests ─────────────────────────────────────────────

describe("smoke tests", () => {
  it("generate-slug should work", () => {
    const result = run('generate-slug "Hello World" --raw');
    assert.equal(result, "hello-world");
  });

  it("current-timestamp should return ISO date", () => {
    const result = run("current-timestamp --raw");
    assert.ok(result.match(/^\d{4}-\d{2}-\d{2}T/), "should be ISO format");
  });

  it("unknown command should error", () => {
    assert.throws(() => run("nonexistent-command"), /Unknown command/);
  });
});
