const assert = require("node:assert/strict");
const test = require("node:test");

const {
    normalizeMondayDate,
    getManilaWeekStart
} = require("../src/utils/weekDate");

test("normalizeMondayDate accepts Mondays and rejects other or invalid dates", () => {
    assert.equal(normalizeMondayDate("2026-07-20"), "2026-07-20");

    assert.throws(
        () => normalizeMondayDate("2026-07-21"),
        (error) => error.statusCode === 400 && error.message === "week_start must be a Monday"
    );
    assert.throws(
        () => normalizeMondayDate("2026-02-29"),
        (error) => error.statusCode === 400 && error.message.includes("valid date")
    );
});

test("getManilaWeekStart respects the Manila Sunday-to-Monday boundary", () => {
    assert.equal(
        getManilaWeekStart(new Date("2026-07-19T15:59:59.000Z")),
        "2026-07-13"
    );
    assert.equal(
        getManilaWeekStart(new Date("2026-07-19T16:00:00.000Z")),
        "2026-07-20"
    );
    assert.throws(() => getManilaWeekStart(new Date("invalid")), /valid Date/);
});
