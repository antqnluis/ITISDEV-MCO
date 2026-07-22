import { describe, expect, it } from "vitest";
import { toRegistrationPayload, validateLogin, validateRegistration } from "./authValidation";

const validRegistration = {
  email: " Student@Example.com ",
  password: "password123",
  confirm_password: "password123",
  student_number: " 20240001 ",
  first_name: " Jamie ",
  last_name: " Reyes ",
};

describe("authentication validation", () => {
  it("validates login credentials", () => {
    expect(validateLogin({ email: "bad-email", password: "" })).toEqual({
      email: "Enter a valid email address.",
      password: "Enter your password.",
    });
    expect(validateLogin({ email: "student@example.com", password: "password" })).toEqual({});
  });

  it("validates the required registration fields and password confirmation", () => {
    const errors = validateRegistration({
      email: "",
      password: "one",
      confirm_password: "two",
      student_number: "12",
      first_name: "",
      last_name: "",
    });

    expect(errors).toMatchObject({
      email: expect.any(String),
      first_name: expect.any(String),
      last_name: expect.any(String),
      student_number: expect.any(String),
      confirm_password: "Passwords do not match.",
    });
    expect(validateRegistration(validRegistration)).toEqual({});
  });

  it("normalizes registration data to the backend contract", () => {
    expect(toRegistrationPayload(validRegistration)).toEqual({
      email: "student@example.com",
      password: "password123",
      student_number: "20240001",
      first_name: "Jamie",
      last_name: "Reyes",
    });
  });
});
