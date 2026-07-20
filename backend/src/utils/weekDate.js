const MANILA_TIME_ZONE = "Asia/Manila";

function createValidationError(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
}

function normalizeMondayDate(value, fieldName = "week_start") {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw createValidationError(`${fieldName} must be a valid date in YYYY-MM-DD format`);
    }

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
        date.getUTCFullYear() !== year
        || date.getUTCMonth() !== month - 1
        || date.getUTCDate() !== day
    ) {
        throw createValidationError(`${fieldName} must be a valid date in YYYY-MM-DD format`);
    }

    if (date.getUTCDay() !== 1) {
        throw createValidationError(`${fieldName} must be a Monday`);
    }

    return value;
}

function getManilaDateParts(date) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: MANILA_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

    return {
        year: Number(values.year),
        month: Number(values.month),
        day: Number(values.day)
    };
}

function getManilaWeekStart(now = new Date()) {
    if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
        throw new TypeError("now must be a valid Date");
    }

    const { year, month, day } = getManilaDateParts(now);
    const manilaDate = new Date(Date.UTC(year, month - 1, day));
    const isoDay = manilaDate.getUTCDay() || 7;
    manilaDate.setUTCDate(manilaDate.getUTCDate() - isoDay + 1);

    return manilaDate.toISOString().slice(0, 10);
}

module.exports = {
    MANILA_TIME_ZONE,
    normalizeMondayDate,
    getManilaWeekStart
};
