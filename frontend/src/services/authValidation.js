const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogin(form) {
  const errors = {};
  const email = form.email.trim();

  if (!email) errors.email = "Enter your email address.";
  else if (!EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address.";

  if (!form.password) errors.password = "Enter your password.";

  return errors;
}

export function validateRegistration(form) {
  const errors = validateLogin(form);
  const firstName = form.first_name.trim();
  const lastName = form.last_name.trim();
  const studentNumber = form.student_number.trim();

  if (!firstName) errors.first_name = "Enter your first name.";
  else if (firstName.length > 100) errors.first_name = "First name must be at most 100 characters.";

  if (!lastName) errors.last_name = "Enter your last name.";
  else if (lastName.length > 100) errors.last_name = "Last name must be at most 100 characters.";

  if (!studentNumber) errors.student_number = "Enter your student number.";
  else if (studentNumber.length < 4 || studentNumber.length > 30) {
    errors.student_number = "Student number must be between 4 and 30 characters.";
  }

  if (!form.confirm_password) errors.confirm_password = "Confirm your password.";
  else if (form.password !== form.confirm_password) {
    errors.confirm_password = "Passwords do not match.";
  }

  return errors;
}

export function toRegistrationPayload(form) {
  return {
    email: form.email.trim().toLowerCase(),
    password: form.password,
    student_number: form.student_number.trim(),
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
  };
}
