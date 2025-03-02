import { test, expect } from '@playwright/test'

test.describe('Authentication E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/auth/login')
  })

  test('should complete registration flow', async ({ page }) => {
    // Navigate to registration
    await page.click('text=Sign up')
    
    // Fill registration form
    await page.fill('input[name="name"]', 'Test User')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'Test@123456')
    await page.fill('input[name="confirmPassword"]', 'Test@123456')
    await page.check('input[name="terms"]')

    // Submit form
    await page.click('button[type="submit"]')

    // Should redirect to login with success message
    await expect(page).toHaveURL(/.*login/)
    await expect(page.locator('.text-green-500')).toBeVisible()
  })

  test('should handle login flow', async ({ page }) => {
    // Fill login form
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'Test@123456')

    // Submit form
    await page.click('button[type="submit"]')

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/)
  })

  test('should handle password reset flow', async ({ page }) => {
    // Navigate to forgot password
    await page.click('text=Forgot password?')

    // Fill email for reset
    await page.fill('input[name="email"]', 'test@example.com')
    await page.click('button[type="submit"]')

    // Should show success message
    await expect(page.locator('text=Check Your Email')).toBeVisible()
  })

  test('should manage profile settings', async ({ page }) => {
    // Login first
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'Test@123456')
    await page.click('button[type="submit"]')

    // Navigate to profile settings
    await page.click('text=Settings')
    await page.click('text=Profile')

    // Update profile information
    await page.fill('input[name="name"]', 'Updated Name')
    await page.click('button:has-text("Save Changes")')

    // Should show success message
    await expect(page.locator('text=Profile updated successfully')).toBeVisible()
  })

  test('should handle security settings', async ({ page }) => {
    // Login first
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'Test@123456')
    await page.click('button[type="submit"]')

    // Navigate to security settings
    await page.click('text=Settings')
    await page.click('text=Security')

    // Change password
    await page.fill('input[name="currentPassword"]', 'Test@123456')
    await page.fill('input[name="newPassword"]', 'NewTest@123456')
    await page.fill('input[name="confirmPassword"]', 'NewTest@123456')
    await page.click('button:has-text("Update Password")')

    // Should show success message
    await expect(page.locator('text=Password successfully updated')).toBeVisible()
  })

  test('should handle session management', async ({ page }) => {
    // Login first
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'Test@123456')
    await page.click('button[type="submit"]')

    // Navigate to security settings
    await page.click('text=Settings')
    await page.click('text=Security')

    // Check active sessions section
    await expect(page.locator('text=Active Sessions')).toBeVisible()

    // Should show current session
    await expect(page.locator('text=Current')).toBeVisible()

    // Test session revocation
    await page.click('text=Sign out all other sessions')
    await expect(page.locator('text=successfully')).toBeVisible()
  })

  test('should handle logout', async ({ page }) => {
    // Login first
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'Test@123456')
    await page.click('button[type="submit"]')

    // Logout
    await page.click('text=Logout')

    // Should redirect to login
    await expect(page).toHaveURL(/.*login/)
  })
})