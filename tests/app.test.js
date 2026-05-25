const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");

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
