const assert = require("node:assert/strict");
const test = require("node:test");

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_ANON_KEY ||= "test-anon-key";

const {
  getAiResult,
  getRiskCategoryFromSwi,
  storeAiResult
} = require("../src/services/wellnessService");

test("getRiskCategoryFromSwi follows the database SWI thresholds", () => {
  assert.equal(getRiskCategoryFromSwi(0), "low");
  assert.equal(getRiskCategoryFromSwi(39.99), "low");
  assert.equal(getRiskCategoryFromSwi(40), "moderate");
  assert.equal(getRiskCategoryFromSwi(69.99), "moderate");
  assert.equal(getRiskCategoryFromSwi(70), "high");
  assert.equal(getRiskCategoryFromSwi(100), "high");
});

test("getAiResult owner-scopes the query and returns a saved analysis", async () => {
  const studentId = "11111111-1111-4111-8111-111111111111";
  const checkInId = "22222222-2222-4222-8222-222222222222";
  const savedAnalysis = { id: "33333333-3333-4333-8333-333333333333" };
  const calls = [];
  const query = {
    select(fields) {
      calls.push(["select", fields]);
      return this;
    },
    eq(field, value) {
      calls.push(["eq", field, value]);
      return this;
    },
    async maybeSingle() {
      calls.push(["maybeSingle"]);
      return { data: savedAnalysis, error: null };
    }
  };
  const supabase = {
    from(table) {
      calls.push(["from", table]);
      return query;
    }
  };

  const result = await getAiResult(supabase, studentId, checkInId);

  assert.equal(result, savedAnalysis);
  assert.deepEqual(calls, [
    ["from", "ai_results"],
    ["select", "*"],
    ["eq", "student_id", studentId],
    ["eq", "check_in_id", checkInId],
    ["maybeSingle"]
  ]);
});

test("getAiResult returns null when no analysis has been saved", async () => {
  const query = {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    async maybeSingle() {
      return { data: null, error: null };
    }
  };
  const supabase = { from: () => query };

  await assert.doesNotReject(async () => {
    const result = await getAiResult(
      supabase,
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222"
    );
    assert.equal(result, null);
  });
});

test("getAiResult converts database failures to a safe service error", async () => {
  const query = {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    async maybeSingle() {
      return { data: null, error: new Error("sensitive database detail") };
    }
  };
  const supabase = { from: () => query };

  await assert.rejects(
    getAiResult(
      supabase,
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222"
    ),
    (error) => error.statusCode === 500
      && error.message === "Unable to retrieve AI analysis"
  );
});

test("storeAiResult upserts one analysis per check-in and returns the stored row", async () => {
  const payload = {
    check_in_id: "11111111-1111-4111-8111-111111111111",
    risk_category: "high"
  };
  const storedResult = {
    id: "22222222-2222-4222-8222-222222222222",
    ...payload
  };
  const calls = [];
  const supabase = {
    from(table) {
      calls.push(["from", table]);
      return {
        upsert(values, options) {
          calls.push(["upsert", values, options]);
          return {
            select() {
              calls.push(["select"]);
              return {
                async single() {
                  calls.push(["single"]);
                  return { data: storedResult, error: null };
                }
              };
            }
          };
        }
      };
    }
  };

  await assert.doesNotReject(async () => {
    const result = await storeAiResult(supabase, payload);
    assert.equal(result, storedResult);
  });

  assert.deepEqual(calls, [
    ["from", "ai_results"],
    ["upsert", [payload], { onConflict: "check_in_id" }],
    ["select"],
    ["single"]
  ]);
});

test("storeAiResult preserves Supabase persistence errors", async () => {
  const databaseError = new Error("upsert failed");
  const supabase = {
    from() {
      return {
        upsert() {
          return {
            select() {
              return {
                async single() {
                  return { data: null, error: databaseError };
                }
              };
            }
          };
        }
      };
    }
  };

  await assert.rejects(
    storeAiResult(supabase, { check_in_id: "check-in-id" }),
    databaseError
  );
});
