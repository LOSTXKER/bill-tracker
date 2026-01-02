"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

export async function authenticate(
  email: string,
  password: string,
  callbackUrl: string = "/"
) {
  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { success: false, error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
        default:
          return { success: false, error: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" };
      }
    }
    throw error;
  }
  
  redirect(callbackUrl);
}
