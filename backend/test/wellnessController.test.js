const assert = require("node:assert/strict");
const test = require("node:test");

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_ANON_KEY ||= "test-anon-key";
process.env.GROQ_API_KEY ||= "test-groq-key";

const wellnessService = require("../src/services/wellnessService");
const wellnessController = require("../src/controllers/wellnessController");
const weeklyCheckInRoutes = require("../src/routes/weeklyCheckInRoutes");
const { requireAuth } = require("../src/middleware/authMiddleware");
const { requireConsent } = require("../src/middleware/consentMiddleware");

const STUDENT_ID = "11111111-1111-4111-8111-111111111111";
const CHECK_IN_ID = "22222222-2222-4222-8222-222222222222";
const DIMENSION_SCORES_ID = "33333333-3333-4333-8333-333333333333";

function createResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

function createRequest(overrides = {}) {
  return {
    user: { id: STUDENT_ID },
    params: { id: CHECK_IN_ID },
    body: { dimension_scores_id: DIMENSION_SCORES_ID },
    supabase: { client: "authenticated" },
    ...overrides
  };
}

test("analyzeWeeklyCheckIn derives trusted IDs and returns the stored result", { concurrency: false }, async () => {
  const original = wellnessService.runWellnessPipeline;
  const aiResult = { id: "ai-result-id" };

  try {
    wellnessService.runWellnessPipeline = async (input) => {
      assert.deepEqual(input, {
        student_id: STUDENT_ID,
        check_in_id: CHECK_IN_ID,
        dimension_scores_id: DIMENSION_SCORES_ID
      });
      return aiResult;
    };

    const response = createResponse();
    await wellnessController.analyzeWeeklyCheckIn(createRequest(), response);

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, {
      success: true,
      data: aiResult
    });
  } finally {
    wellnessService.runWellnessPipeline = original;
  }
});

test("analyzeWeeklyCheckIn validates authentication and analysis IDs", { concurrency: false }, async () => {
  const original = wellnessService.runWellnessPipeline;
  let serviceCalled = false;

  try {
    wellnessService.runWellnessPipeline = async () => {
      serviceCalled = true;
    };

    const cases = [
      {
        request: createRequest({ user: null }),
        statusCode: 401,
        message: "An authenticated student is required"
      },
      {
        request: createRequest({ params: { id: "not-a-uuid" } }),
        statusCode: 400,
        message: "check_in_id must be a valid UUID"
      },
      {
        request: createRequest({ body: {} }),
        statusCode: 400,
        message: "dimension_scores_id is required"
      },
      {
        request: createRequest({ body: { dimension_scores_id: "not-a-uuid" } }),
        statusCode: 400,
        message: "dimension_scores_id must be a valid UUID"
      }
    ];

    for (const scenario of cases) {
      const response = createResponse();
      await wellnessController.analyzeWeeklyCheckIn(scenario.request, response);

      assert.equal(response.statusCode, scenario.statusCode);
      assert.deepEqual(response.body, {
        success: false,
        message: scenario.message
      });
    }

    assert.equal(serviceCalled, false);
  } finally {
    wellnessService.runWellnessPipeline = original;
  }
});

test("analyzeWeeklyCheckIn preserves known errors and sanitizes unknown failures", { concurrency: false }, async () => {
  const originalPipeline = wellnessService.runWellnessPipeline;
  const originalConsoleError = console.error;

  try {
    wellnessService.runWellnessPipeline = async () => {
      const error = new Error("Wellness dimension scores not found");
      error.statusCode = 404;
      throw error;
    };

    const knownResponse = createResponse();
    await wellnessController.analyzeWeeklyCheckIn(createRequest(), knownResponse);
    assert.equal(knownResponse.statusCode, 404);
    assert.deepEqual(knownResponse.body, {
      success: false,
      message: "Wellness dimension scores not found"
    });

    console.error = () => {};
    wellnessService.runWellnessPipeline = async () => {
      throw new Error("sensitive database detail");
    };

    const unknownResponse = createResponse();
    await wellnessController.analyzeWeeklyCheckIn(createRequest(), unknownResponse);
    assert.equal(unknownResponse.statusCode, 500);
    assert.deepEqual(unknownResponse.body, {
      success: false,
      message: "AI analysis failed"
    });
  } finally {
    wellnessService.runWellnessPipeline = originalPipeline;
    console.error = originalConsoleError;
  }
});

test("the Groq client reports unavailable analysis when its key is missing", { concurrency: false }, () => {
  const originalApiKey = process.env.GROQ_API_KEY;

  try {
    delete process.env.GROQ_API_KEY;

    assert.throws(
      () => wellnessService.loadGroqClient(),
      (error) => error.statusCode === 503
        && error.message === "GROQ_API_KEY is required for wellness analysis"
    );
  } finally {
    process.env.GROQ_API_KEY = originalApiKey;
  }
});

test("getWeeklyAnalysis returns the authenticated student's saved result or null", { concurrency: false }, async () => {
  const original = wellnessService.getAiResult;
  const savedAnalysis = { id: "ai-result-id" };
  const request = createRequest();
  let resultToReturn = savedAnalysis;

  try {
    wellnessService.getAiResult = async (supabase, studentId, checkInId) => {
      assert.equal(supabase, request.supabase);
      assert.equal(studentId, STUDENT_ID);
      assert.equal(checkInId, CHECK_IN_ID);
      return resultToReturn;
    };

    const savedResponse = createResponse();
    await wellnessController.getWeeklyAnalysis(request, savedResponse);
    assert.equal(savedResponse.statusCode, 200);
    assert.deepEqual(savedResponse.body, {
      success: true,
      aiResult: savedAnalysis
    });

    resultToReturn = null;
    const missingResponse = createResponse();
    await wellnessController.getWeeklyAnalysis(request, missingResponse);
    assert.equal(missingResponse.statusCode, 200);
    assert.deepEqual(missingResponse.body, {
      success: true,
      aiResult: null
    });
  } finally {
    wellnessService.getAiResult = original;
  }
});

test("getWeeklyAnalysis validates authentication and check-in ID", { concurrency: false }, async () => {
  const original = wellnessService.getAiResult;
  let serviceCalled = false;

  try {
    wellnessService.getAiResult = async () => {
      serviceCalled = true;
    };

    const cases = [
      {
        request: createRequest({ user: null }),
        statusCode: 401,
        message: "An authenticated student is required"
      },
      {
        request: createRequest({ params: { id: "not-a-uuid" } }),
        statusCode: 400,
        message: "check_in_id must be a valid UUID"
      }
    ];

    for (const scenario of cases) {
      const response = createResponse();
      await wellnessController.getWeeklyAnalysis(scenario.request, response);

      assert.equal(response.statusCode, scenario.statusCode);
      assert.deepEqual(response.body, {
        success: false,
        message: scenario.message
      });
    }

    assert.equal(serviceCalled, false);
  } finally {
    wellnessService.getAiResult = original;
  }
});

test("getWeeklyAnalysis returns safe service errors", { concurrency: false }, async () => {
  const original = wellnessService.getAiResult;

  try {
    wellnessService.getAiResult = async () => {
      const error = new Error("Unable to retrieve AI analysis");
      error.statusCode = 500;
      throw error;
    };

    const response = createResponse();
    await wellnessController.getWeeklyAnalysis(createRequest(), response);
    assert.equal(response.statusCode, 500);
    assert.deepEqual(response.body, {
      success: false,
      message: "Unable to retrieve AI analysis"
    });
  } finally {
    wellnessService.getAiResult = original;
  }
});

test("the analysis routes are registered after authentication and consent middleware", () => {
  const authIndex = weeklyCheckInRoutes.stack.findIndex(
    (layer) => layer.handle === requireAuth
  );
  const consentIndex = weeklyCheckInRoutes.stack.findIndex(
    (layer) => layer.handle === requireConsent
  );
  const routeIndex = weeklyCheckInRoutes.stack.findIndex(
    (layer) => layer.route?.path === "/:id/analyze"
      && layer.route.methods.post
  );
  const getRouteIndex = weeklyCheckInRoutes.stack.findIndex(
    (layer) => layer.route?.path === "/:id/analysis"
      && layer.route.methods.get
  );

  assert.ok(authIndex >= 0);
  assert.ok(consentIndex > authIndex);
  assert.ok(routeIndex > consentIndex);
  assert.ok(getRouteIndex > consentIndex);
});
