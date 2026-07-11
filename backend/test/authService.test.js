const assert = require("node:assert/strict");
const test = require("node:test");

const configPath = require.resolve("../src/config/supabaseClient");
const servicePath = require.resolve("../src/services/authService");
const middlewarePath = require.resolve("../src/middleware/authMiddleware");

function loadModule(modulePath, config) {
    delete require.cache[modulePath];
    require.cache[configPath] = {
        id: configPath,
        filename: configPath,
        loaded: true,
        exports: config
    };

    return require(modulePath);
}

function createSession() {
    return {
        access_token: "access-token",
        refresh_token: "refresh-token",
        expires_in: 3600,
        expires_at: 1234567890,
        token_type: "bearer"
    };
}

test("registerStudent creates the RLS-scoped student record and returns its session", { concurrency: false }, async () => {
    const session = createSession();
    const insertedStudent = {
        id: "student-id",
        student_number: "20240001"
    };
    let insertedValues;

    const authService = loadModule(servicePath, {
        publicSupabase: {
            auth: {
                signUp: async () => ({
                    data: {
                        user: {
                            id: "student-id",
                            email: "student@example.com",
                            created_at: "2026-01-01T00:00:00.000Z"
                        },
                        session
                    },
                    error: null
                })
            }
        },
        createAuthenticatedSupabaseClient: (token) => {
            assert.equal(token, session.access_token);
            return {
                from: (table) => {
                    assert.equal(table, "students");
                    return {
                        insert: (values) => {
                            insertedValues = values;
                            return {
                                select: () => ({
                                    single: async () => ({ data: insertedStudent, error: null })
                                })
                            };
                        }
                    };
                }
            };
        },
        signOutSession: async () => {}
    });

    const result = await authService.registerStudent({
        email: " Student@Example.com ",
        password: "a secure password",
        student_number: " 20240001 "
    });

    assert.deepEqual(insertedValues, {
        id: "student-id",
        student_number: "20240001"
    });
    assert.equal(result.user.email, "student@example.com");
    assert.deepEqual(result.session, session);
    assert.deepEqual(result.student, insertedStudent);
});

test("loginStudent returns a session payload instead of dropping tokens", { concurrency: false }, async () => {
    const session = createSession();
    const authService = loadModule(servicePath, {
        publicSupabase: {
            auth: {
                signInWithPassword: async ({ email, password }) => {
                    assert.equal(email, "student@example.com");
                    assert.equal(password, "password");
                    return {
                        data: {
                            user: {
                                id: "student-id",
                                email,
                                created_at: "2026-01-01T00:00:00.000Z"
                            },
                            session
                        },
                        error: null
                    };
                }
            }
        },
        createAuthenticatedSupabaseClient: () => {
            throw new Error("not used by login");
        },
        signOutSession: async () => {}
    });

    const result = await authService.loginStudent({
        email: "student@example.com",
        password: "password"
    });

    assert.deepEqual(result.session, session);
    assert.equal(result.user.id, "student-id");
});

test("registerStudent reports a configuration error when Supabase does not issue a session", { concurrency: false }, async () => {
    const authService = loadModule(servicePath, {
        publicSupabase: {
            auth: {
                signUp: async () => ({
                    data: {
                        user: { id: "student-id", email: "student@example.com" },
                        session: null
                    },
                    error: null
                })
            }
        },
        createAuthenticatedSupabaseClient: () => {
            throw new Error("a session is required before a student record is inserted");
        },
        signOutSession: async () => {}
    });

    await assert.rejects(
        authService.registerStudent({
            email: "student@example.com",
            password: "password",
            student_number: "20240001"
        }),
        (error) => error.statusCode === 503
            && error.message.includes("email confirmation")
    );
});

test("getCurrentStudent scopes the query to the authenticated student and logout revokes its token", { concurrency: false }, async () => {
    let requestedStudentId;
    let signedOutToken;
    const authService = loadModule(servicePath, {
        publicSupabase: { auth: {} },
        createAuthenticatedSupabaseClient: () => ({}),
        signOutSession: async (token) => {
            signedOutToken = token;
        }
    });
    const requestSupabase = {
        from: (table) => {
            assert.equal(table, "students");
            return {
                select: () => ({
                    eq: (field, value) => {
                        assert.equal(field, "id");
                        requestedStudentId = value;
                        return {
                            maybeSingle: async () => ({
                                data: { id: "student-id", student_number: "20240001" },
                                error: null
                            })
                        };
                    }
                })
            };
        }
    };

    const student = await authService.getCurrentStudent(requestSupabase, "student-id");
    await authService.logoutStudent("access-token");

    assert.equal(requestedStudentId, "student-id");
    assert.deepEqual(student, { id: "student-id", student_number: "20240001" });
    assert.equal(signedOutToken, "access-token");
});

test("requireAuth rejects missing credentials and attaches a verified user", { concurrency: false }, async () => {
    const { requireAuth } = loadModule(middlewarePath, {
        publicSupabase: {
            auth: {
                getUser: async (token) => {
                    assert.equal(token, "valid-token");
                    return {
                        data: { user: { id: "student-id", email: "student@example.com" } },
                        error: null
                    };
                }
            }
        },
        createAuthenticatedSupabaseClient: (token) => ({ token })
    });

    const missingResponse = createResponse();
    await requireAuth({ get: () => undefined }, missingResponse, () => {
        throw new Error("next should not run");
    });
    assert.equal(missingResponse.statusCode, 401);

    const request = { get: () => "Bearer valid-token" };
    let nextCalled = false;
    await requireAuth(request, createResponse(), () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(request.user.id, "student-id");
    assert.deepEqual(request.supabase, { token: "valid-token" });
});

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
