import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { requireCronSecret } from "../lib/cronAuth";

describe("requireCronSecret", () => {
  const prev = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = "test-secret";
  });

  afterEach(() => {
    process.env.CRON_SECRET = prev;
  });

  it("returns 401 when Authorization missing", () => {
    const req = new NextRequest("http://localhost/api/cron/x");
    const res = requireCronSecret(req);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
  });

  it("returns 401 when token wrong", () => {
    const req = new NextRequest("http://localhost/api/cron/x", {
      headers: { authorization: "Bearer wrong" },
    });
    const res = requireCronSecret(req);
    expect(res?.status).toBe(401);
  });

  it("returns null when token matches", () => {
    const req = new NextRequest("http://localhost/api/cron/x", {
      headers: { authorization: "Bearer test-secret" },
    });
    expect(requireCronSecret(req)).toBeNull();
  });
});
