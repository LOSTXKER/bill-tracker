import { describe, it, expect } from "vitest";
import { apiResponse } from "@/lib/api/response";
import { ApiError, ApiErrors } from "@/lib/api/errors";

describe("API Response Helper", () => {
  describe("success", () => {
    it("should return successful response with data", () => {
      const data = { id: "123", name: "Test" };
      const response = apiResponse.success(data);

      expect(response.status).toBe(200);
      
      // Parse response body
      response.json().then((body: any) => {
        expect(body.success).toBe(true);
        expect(body.data).toEqual(data);
      });
    });

    it("should include message when provided", () => {
      const data = { id: "123" };
      const message = "Operation successful";
      const response = apiResponse.success(data, message);

      response.json().then((body: any) => {
        expect(body.message).toBe(message);
      });
    });

    it("should allow custom status code", () => {
      const response = apiResponse.success({ test: true }, undefined, 202);
      expect(response.status).toBe(202);
    });
  });

  describe("created", () => {
    it("should return 201 status", () => {
      const data = { id: "new-123" };
      const response = apiResponse.created(data);

      expect(response.status).toBe(201);
      
      response.json().then((body: any) => {
        expect(body.success).toBe(true);
        expect(body.data).toEqual(data);
      });
    });

    it("should include creation message", () => {
      const response = apiResponse.created({ id: "123" }, "Resource created");

      response.json().then((body: any) => {
        expect(body.message).toBe("Resource created");
      });
    });
  });

  describe("error", () => {
    it("should handle ApiError instances", () => {
      const error = ApiErrors.notFound("User");
      const response = apiResponse.error(error);

      expect(response.status).toBe(404);
      
      response.json().then((body: any) => {
        expect(body.success).toBe(false);
        expect(body.error).toContain("User");
        expect(body.code).toBeDefined();
      });
    });

    it("should handle Error instances", () => {
      const error = new Error("Something went wrong");
      const response = apiResponse.error(error);

      expect(response.status).toBe(500);
      
      response.json().then((body: any) => {
        expect(body.success).toBe(false);
        expect(body.error).toBe("Something went wrong");
      });
    });

    it("should handle string errors", () => {
      const response = apiResponse.error("Custom error message");

      expect(response.status).toBe(500);
      
      response.json().then((body: any) => {
        expect(body.success).toBe(false);
        expect(body.error).toBe("Custom error message");
      });
    });

    it("should include custom headers", () => {
      const headers = { "X-Custom": "value" };
      const response = apiResponse.error("Error", headers);

      expect(response.headers.get("X-Custom")).toBe("value");
    });
  });

  describe("notFound", () => {
    it("should return 404 with default message", () => {
      const response = apiResponse.notFound();

      expect(response.status).toBe(404);
      
      response.json().then((body: any) => {
        expect(body.success).toBe(false);
        expect(body.error).toBe("Resource not found");
        expect(body.code).toBe("NOT_FOUND");
      });
    });

    it("should use custom message", () => {
      const response = apiResponse.notFound("User not found");

      response.json().then((body: any) => {
        expect(body.error).toBe("User not found");
      });
    });
  });

  describe("unauthorized", () => {
    it("should return 401 with default message", () => {
      const response = apiResponse.unauthorized();

      expect(response.status).toBe(401);
      
      response.json().then((body: any) => {
        expect(body.success).toBe(false);
        expect(body.code).toBe("UNAUTHORIZED");
      });
    });
  });

  describe("forbidden", () => {
    it("should return 403 with default message", () => {
      const response = apiResponse.forbidden();

      expect(response.status).toBe(403);
      
      response.json().then((body: any) => {
        expect(body.success).toBe(false);
        expect(body.code).toBe("FORBIDDEN");
      });
    });

    it("should use custom message", () => {
      const response = apiResponse.forbidden("Access denied to this resource");

      response.json().then((body: any) => {
        expect(body.error).toBe("Access denied to this resource");
      });
    });
  });

  describe("badRequest", () => {
    it("should return 400 with default message", () => {
      const response = apiResponse.badRequest();

      expect(response.status).toBe(400);
      
      response.json().then((body: any) => {
        expect(body.success).toBe(false);
        expect(body.code).toBe("BAD_REQUEST");
      });
    });

    it("should use custom message", () => {
      const response = apiResponse.badRequest("Invalid input data");

      response.json().then((body: any) => {
        expect(body.error).toBe("Invalid input data");
      });
    });
  });
});

describe("API Errors", () => {
  it("should create not found error", () => {
    const error = ApiErrors.notFound("User");
    
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(404);
    expect(error.message).toContain("User");
  });

  it("should create bad request error", () => {
    const error = ApiErrors.badRequest("Invalid data");
    
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe("Invalid data");
  });

  it("should create unauthorized error", () => {
    const error = ApiErrors.unauthorized();
    
    expect(error.statusCode).toBe(401);
  });

  it("should create forbidden error", () => {
    const error = ApiErrors.forbidden("No permission");
    
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe("No permission");
  });
});
