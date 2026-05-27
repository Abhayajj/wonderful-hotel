const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");

jest.setTimeout(30000);

beforeAll(async () => {
  if (mongoose.connection.readyState !== 1) {
    await new Promise((resolve) => {
      mongoose.connection.once("open", resolve);
    });
  }
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Public Views & Express Integration Tests", () => {
  test("GET / should redirect to /listings", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/listings");
  });

  test("GET /listings should return 200 OK and HTML output", async () => {
    const res = await request(app).get("/listings");
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
  });

  test("GET /privacy should load the privacy page", async () => {
    const res = await request(app).get("/privacy");
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain("Privacy Policy");
  });

  test("GET /terms should load the terms of service page", async () => {
    const res = await request(app).get("/terms");
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain("Terms of Service");
  });

  test("GET /listings/12345 should redirect to /listings due to invalid ObjectID", async () => {
    const res = await request(app).get("/listings/12345");
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/listings");
  });
});

describe("Authentication & Password Reset Integration Tests", () => {
  const User = require("../models/user");
  const testUsername = "forgottestuser_" + Date.now();
  const testEmail = testUsername + "@example.com";
  const testPassword = "password123";
  let testUser;

  beforeAll(async () => {
    // Ensure test user is registered
    const newUser = new User({ email: testEmail, username: testUsername });
    testUser = await User.register(newUser, testPassword);
  });

  afterAll(async () => {
    // Clean up test user
    if (testUser) {
      await User.deleteOne({ _id: testUser._id });
    }
  });

  test("GET /forgot should render the forgot password form", async () => {
    const res = await request(app).get("/forgot");
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain("Forgot Password");
  });

  test("POST /forgot with non-existent email should fail and redirect to /forgot", async () => {
    const res = await request(app)
      .post("/forgot")
      .send({ email: "doesnotexist@example.com" });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/forgot");
  });

  test("POST /forgot with empty email should fail and redirect to /forgot", async () => {
    const res = await request(app)
      .post("/forgot")
      .send({ email: "" });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/forgot");
  });

  test("POST /forgot with valid email should generate token and redirect to /forgot", async () => {
    const res = await request(app)
      .post("/forgot")
      .send({ email: testEmail });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/forgot");

    // Check database to ensure token was generated
    const updatedUser = await User.findOne({ email: testEmail });
    expect(updatedUser.resetPasswordToken).toBeDefined();
    expect(updatedUser.resetPasswordExpires).toBeDefined();
    expect(updatedUser.resetPasswordExpires.getTime()).toBeGreaterThan(Date.now());
  });

  test("GET /reset/:token with invalid token should redirect to /forgot", async () => {
    const res = await request(app).get("/reset/invalidtoken123");
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/forgot");
  });

  test("GET /reset/:token with valid token should render reset password form", async () => {
    const user = await User.findOne({ email: testEmail });
    const token = user.resetPasswordToken;

    const res = await request(app).get(`/reset/${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain("Reset Password");
  });

  test("POST /reset/:token with mismatching passwords should fail and redirect", async () => {
    const user = await User.findOne({ email: testEmail });
    const token = user.resetPasswordToken;

    const res = await request(app)
      .post(`/reset/${token}`)
      .send({ password: "newpassword123", confirmPassword: "differentpassword" });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe(`/reset/${token}`);
  });

  test("POST /reset/:token with too short password should fail and redirect", async () => {
    const user = await User.findOne({ email: testEmail });
    const token = user.resetPasswordToken;

    const res = await request(app)
      .post(`/reset/${token}`)
      .send({ password: "short", confirmPassword: "short" });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe(`/reset/${token}`);
  });

  test("POST /reset/:token with valid token and password should succeed, update password, and login", async () => {
    const user = await User.findOne({ email: testEmail });
    const token = user.resetPasswordToken;
    const newPassword = "newpassword12345";

    const res = await request(app)
      .post(`/reset/${token}`)
      .send({ password: newPassword, confirmPassword: newPassword });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/listings");

    // Verify token is cleared in DB
    const updatedUser = await User.findOne({ email: testEmail });
    expect(updatedUser.resetPasswordToken).toBeUndefined();
    expect(updatedUser.resetPasswordExpires).toBeUndefined();

    // Verify new password can authenticate
    const authenticate = User.authenticate();
    const authResult = await authenticate(testUsername, newPassword);
    expect(authResult.user).toBeDefined();
    expect(authResult.user.username).toBe(testUsername);
  });
});

