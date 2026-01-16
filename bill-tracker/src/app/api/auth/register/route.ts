import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validations/auth";
import { apiResponse } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate input
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      const firstError = result.error.issues?.[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
      return apiResponse.badRequest(firstError);
    }

    const { name, email, password } = result.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return apiResponse.badRequest("อีเมลนี้ถูกใช้งานแล้ว");
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        name,
        email,
        password: hashedPassword,
        role: "STAFF", // Default role
        updatedAt: new Date(),
      },
    });

    return apiResponse.created(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      "สร้างบัญชีสำเร็จ"
    );
  } catch (error) {
    console.error("Registration error:", error);
    
    // Handle Prisma unique constraint error
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return apiResponse.badRequest("อีเมลนี้ถูกใช้งานแล้ว");
    }
    
    // Log detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Registration detailed error:", errorMessage);
    
    // Check for database connection errors
    if (errorMessage.includes("connect") || errorMessage.includes("ECONNREFUSED") || errorMessage.includes("timeout")) {
      return apiResponse.error("ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
    }
    
    return apiResponse.error("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
  }
}
