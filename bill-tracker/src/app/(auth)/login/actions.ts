"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect";

export async function authenticate(
  email: string,
  password: string,
  callbackUrl: string = "/"
) {
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl,
    });
    return { success: true };
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { success: false, error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
        default:
          return { success: false, error: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" };
      }
    }
    return { success: false, error: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" };
  }
}
