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
        student_number: "20240001",
        first_name: "Jamie",
        last_name: "Reyes"
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
        serviceSupabase: {
            auth: {
                admin: {
                    deleteUser: async () => ({ error: null })
                }
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
        student_number: " 20240001 ",
        first_name: " Jamie ",
        last_name: " Reyes "
    });

    assert.deepEqual(insertedValues, {
        id: "student-id",
        student_number: "20240001",
        first_name: "Jamie",
        last_name: "Reyes"
    });
    assert.equal(result.user.email, "student@example.com");
    assert.deepEqual(result.session, session);
    assert.deepEqual(result.student, {
        ...insertedStudent,
        onboarding_completed: false
    });
});

test("registerStudent validates the required student names before creating an auth user", { concurrency: false }, async () => {
    let signUpCalled = false;
    const authService = loadModule(servicePath, {
        publicSupabase: {
            auth: {
                signUp: async () => {
                    signUpCalled = true;
                    throw new Error("should not be called");
                }
            }
        },
        createAuthenticatedSupabaseClient: () => ({}),
        signOutSession: async () => {}
    });

    await assert.rejects(
        authService.registerStudent({
            email: "student@example.com",
            password: "password",
            student_number: "20240001",
            first_name: " ",
            last_name: "Reyes"
        }),
        (error) => error.statusCode === 400 && error.message === "first_name is required"
    );
    await assert.rejects(
        authService.registerStudent({
            email: "student@example.com",
            password: "password",
            student_number: "20240001",
            first_name: "Jamie",
            last_name: "x".repeat(101)
        }),
        (error) => error.statusCode === 400 && error.message.includes("last_name")
    );
    assert.equal(signUpCalled, false);
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
    let deletedUserId;
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
        serviceSupabase: {
            auth: {
                admin: {
                    deleteUser: async (userId) => {
                        deletedUserId = userId;
                        return { error: null };
                    }
                }
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
            student_number: "20240001",
            first_name: "Jamie",
            last_name: "Reyes"
        }),
        (error) => error.statusCode === 503
            && error.message.includes("email confirmation")
    );
    assert.equal(deletedUserId, "student-id");
});

test("registerStudent removes the Auth user when the student record cannot be created", { concurrency: false }, async () => {
    const deletedUserIds = [];
    const authService = loadModule(servicePath, {
        publicSupabase: {
            auth: {
                signUp: async () => ({
                    data: {
                        user: { id: "student-id", email: "student@example.com" },
                        session: createSession()
                    },
                    error: null
                })
            }
        },
        serviceSupabase: {
            auth: {
                admin: {
                    deleteUser: async (userId) => {
                        deletedUserIds.push(userId);
                        return { error: null };
                    }
                }
            }
        },
        createAuthenticatedSupabaseClient: () => ({
            from: () => ({
                insert: () => ({
                    select: () => ({
                        single: async () => ({
                            data: null,
                            error: { code: "23505", message: "duplicate student number" }
                        })
                    })
                })
            })
        }),
        signOutSession: async () => {}
    });

    await assert.rejects(
        authService.registerStudent({
            email: "student@example.com",
            password: "password",
            student_number: "20240001",
            first_name: "Jamie",
            last_name: "Reyes"
        }),
        (error) => error.statusCode === 409
            && error.message === "student_number is already registered"
    );
    assert.deepEqual(deletedUserIds, ["student-id"]);
});

test("registerStudent reports cleanup failures without leaving a retryable registration response", { concurrency: false }, async () => {
    const authService = loadModule(servicePath, {
        publicSupabase: {
            auth: {
                signUp: async () => ({
                    data: {
                        user: { id: "student-id", email: "student@example.com" },
                        session: createSession()
                    },
                    error: null
                })
            }
        },
        serviceSupabase: {
            auth: {
                admin: {
                    deleteUser: async () => ({
                        error: { message: "admin unavailable" }
                    })
                }
            }
        },
        createAuthenticatedSupabaseClient: () => ({
            from: () => ({
                insert: () => ({
                    select: () => ({
                        single: async () => ({
                            data: null,
                            error: { message: "database unavailable" }
                        })
                    })
                })
            })
        }),
        signOutSession: async () => {}
    });

    await assert.rejects(
        authService.registerStudent({
            email: "student@example.com",
            password: "password",
            student_number: "20240001",
            first_name: "Jamie",
            last_name: "Reyes"
        }),
        (error) => error.statusCode === 500
            && error.message.includes("incomplete account could not be removed")
    );
});

test("registerStudent requires cleanup capability before creating an Auth user", { concurrency: false }, async () => {
    let signUpCalled = false;
    const authService = loadModule(servicePath, {
        publicSupabase: {
            auth: {
                signUp: async () => {
                    signUpCalled = true;
                    throw new Error("should not be called");
                }
            }
        },
        serviceSupabase: null,
        createAuthenticatedSupabaseClient: () => ({}),
        signOutSession: async () => {}
    });

    await assert.rejects(
        authService.registerStudent({
            email: "student@example.com",
            password: "password",
            student_number: "20240001",
            first_name: "Jamie",
            last_name: "Reyes"
        }),
        (error) => error.statusCode === 503
            && error.message.includes("SUPABASE_SERVICE_ROLE_KEY")
    );
    assert.equal(signUpCalled, false);
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
            assert.ok(["students", "student_profiles"].includes(table));
            return {
                select: () => ({
                    eq: (field, value) => {
                        assert.equal(
                            field,
                            table === "students" ? "id" : "student_id"
                        );
                        requestedStudentId = value;
                        return {
                            maybeSingle: async () => ({
                                data: table === "students"
                                    ? {
                                        id: "student-id",
                                        student_number: "20240001",
                                        first_name: "Jamie",
                                        last_name: "Reyes"
                                    }
                                    : {
                                        onboarding_completed_at: "2026-01-01T00:00:00.000Z"
                                    },
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
    assert.deepEqual(student, {
        id: "student-id",
        student_number: "20240001",
        first_name: "Jamie",
        last_name: "Reyes",
        onboarding_completed: true
    });
    assert.equal(signedOutToken, "access-token");
});

test("getCurrentStudent reports incomplete onboarding when no profile exists", { concurrency: false }, async () => {
    const authService = loadModule(servicePath, {
        publicSupabase: { auth: {} },
        createAuthenticatedSupabaseClient: () => ({}),
        signOutSession: async () => {}
    });
    const requestSupabase = {
        from: (table) => ({
            select: () => ({
                eq: () => ({
                    maybeSingle: async () => ({
                        data: table === "students"
                            ? { id: "student-id", first_name: "Jamie", last_name: "Reyes" }
                            : null,
                        error: null
                    })
                })
            })
        })
    };

    const student = await authService.getCurrentStudent(requestSupabase, "student-id");
    assert.equal(student.onboarding_completed, false);
});

test("updateCurrentStudent accepts only validated student names", { concurrency: false }, async () => {
    const authService = loadModule(servicePath, {});

    await assert.rejects(
        authService.updateCurrentStudent({}, "student-id", {}),
        (error) => error.statusCode === 400
            && error.message.includes("At least one student field")
    );
    await assert.rejects(
        authService.updateCurrentStudent({}, "student-id", {
            student_number: "20240002"
        }),
        (error) => error.statusCode === 400
            && error.message.includes("not an editable student field")
    );
    await assert.rejects(
        authService.updateCurrentStudent({}, "student-id", {
            first_name: " "
        }),
        (error) => error.statusCode === 400
            && error.message.includes("first_name is required")
    );
    await assert.rejects(
        authService.updateCurrentStudent({}, "student-id", {
            last_name: "x".repeat(101)
        }),
        (error) => error.statusCode === 400
            && error.message.includes("at most 100 characters")
    );
});

test("updateCurrentStudent trims names and scopes the update to the authenticated student", { concurrency: false }, async () => {
    const authService = loadModule(servicePath, {});
    let updatedValues;
    let updatedStudentId;
    const updatedStudent = {
        id: "student-id",
        student_number: "20240001",
        first_name: "Jamie",
        last_name: "Reyes"
    };
    const supabase = {
        from: (table) => {
            assert.equal(table, "students");
            return {
                update: (values) => {
                    updatedValues = values;
                    return {
                        eq: (field, value) => {
                            assert.equal(field, "id");
                            updatedStudentId = value;
                            return {
                                select: () => ({
                                    maybeSingle: async () => ({
                                        data: updatedStudent,
                                        error: null
                                    })
                                })
                            };
                        }
                    };
                }
            };
        }
    };

    const result = await authService.updateCurrentStudent(
        supabase,
        "student-id",
        {
            first_name: " Jamie ",
            last_name: " Reyes "
        }
    );

    assert.deepEqual(updatedValues, {
        first_name: "Jamie",
        last_name: "Reyes"
    });
    assert.equal(updatedStudentId, "student-id");
    assert.deepEqual(result, updatedStudent);
});

test("updateCurrentStudent reports missing students and database failures", { concurrency: false }, async () => {
    const authService = loadModule(servicePath, {});

    function updateResponse(response) {
        return {
            from: () => ({
                update: () => ({
                    eq: () => ({
                        select: () => ({
                            maybeSingle: async () => response
                        })
                    })
                })
            })
        };
    }

    await assert.rejects(
        authService.updateCurrentStudent(
            updateResponse({ data: null, error: null }),
            "student-id",
            { first_name: "Jamie" }
        ),
        (error) => error.statusCode === 404
    );
    await assert.rejects(
        authService.updateCurrentStudent(
            updateResponse({ data: null, error: { message: "database detail" } }),
            "student-id",
            { first_name: "Jamie" }
        ),
        (error) => error.statusCode === 500
            && error.message === "Unable to update the current student"
    );
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
