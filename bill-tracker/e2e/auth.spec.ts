import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Authentication Flow
 */

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    
    // Check for login form elements
    await expect(page.getByRole('heading', { level: 1 })).toContainText('เข้าสู่ระบบ');
    await expect(page.getByLabel('อีเมล')).toBeVisible();
    await expect(page.getByLabel('รหัสผ่าน')).toBeVisible();
    await expect(page.getByRole('button', { name: 'เข้าสู่ระบบ' })).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/login');
    
    // Click login without filling form
    await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
    
    // Should show validation error
    await expect(page.getByText('กรุณากรอกอีเมล')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in invalid credentials
    await page.getByLabel('อีเมล').fill('invalid@example.com');
    await page.getByLabel('รหัสผ่าน').fill('wrongpassword');
    await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
    
    // Should show error message (wait for response)
    await expect(page.getByText('อีเมลหรือรหัสผ่านไม่ถูกต้อง')).toBeVisible({ timeout: 10000 });
  });

  test('should have link to register page', async ({ page }) => {
    await page.goto('/login');
    
    // Check for register link
    const registerLink = page.getByRole('link', { name: 'สมัครสมาชิก' });
    await expect(registerLink).toBeVisible();
    
    // Click and verify navigation
    await registerLink.click();
    await expect(page).toHaveURL(/.*register/);
  });

  test('should display register page', async ({ page }) => {
    await page.goto('/register');
    
    // Check for register form elements
    await expect(page.getByRole('heading', { level: 1 })).toContainText('สมัครสมาชิก');
    await expect(page.getByLabel('ชื่อ')).toBeVisible();
    await expect(page.getByLabel('อีเมล')).toBeVisible();
    await expect(page.getByLabel('รหัสผ่าน')).toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
  });

  test('should redirect to login when accessing expenses without auth', async ({ page }) => {
    await page.goto('/expenses');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
  });
});
