import { test, expect } from '@playwright/test'

test.describe('Marketplace E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:3000/auth/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'Test@123456')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard')
  })

  test('complete shopping flow', async ({ page }) => {
    // Navigate to marketplace
    await page.goto('http://localhost:3000/marketplace')

    // Test product filtering
    await page.click('text=Tools')
    await page.fill('input[placeholder="Min"]', '10')
    await page.fill('input[placeholder="Max"]', '100')
    await page.selectOption('select[aria-label="Sort by"]', 'price')

    // Verify filtered results
    await expect(page.locator('.product-card')).toHaveCount(3)

    // Add item to cart
    await page.click('.product-card:first-child button:text("Add to Cart")')
    await expect(page.locator('.cart-count')).toHaveText('1')

    // Open cart sidebar
    await page.click('button[aria-label="Open cart"]')
    await expect(page.locator('.cart-sidebar')).toBeVisible()

    // Proceed to checkout
    await page.click('text=Proceed to Checkout')
    await expect(page).toHaveURL(/.*checkout/)

    // Fill shipping information
    await page.fill('input[name="fullName"]', 'Test User')
    await page.fill('input[name="street"]', '123 Test St')
    await page.fill('input[name="city"]', 'Test City')
    await page.fill('input[name="state"]', 'Test State')
    await page.fill('input[name="country"]', 'Test Country')
    await page.fill('input[name="postalCode"]', '12345')
    await page.fill('input[name="phone"]', '1234567890')

    // Select delivery option
    await page.click('text=Express Shipping')

    // Continue to payment
    await page.click('text=Continue to Payment')

    // Fill payment information
    await page.click('text=Credit/Debit Card')
    await page.fill('input[name="cardNumber"]', '4242424242424242')
    await page.fill('input[name="expiryDate"]', '12/25')
    await page.fill('input[name="cvv"]', '123')
    await page.fill('input[name="nameOnCard"]', 'Test User')

    // Complete purchase
    await page.click('text=Complete Purchase')

    // Verify success page
    await expect(page).toHaveURL(/.*confirmation/)
    await expect(page.locator('h1')).toContainText('Order Confirmed')

    // Verify order details
    await expect(page.locator('.order-summary')).toBeVisible()
    await expect(page.locator('.delivery-info')).toBeVisible()

    // Check cart is cleared
    await page.goto('http://localhost:3000/marketplace')
    await expect(page.locator('.cart-count')).toHaveText('0')
  })

  test('cart persistence', async ({ page }) => {
    await page.goto('http://localhost:3000/marketplace')

    // Add items to cart
    await page.click('.product-card:first-child button:text("Add to Cart")')
    await page.click('.product-card:nth-child(2) button:text("Add to Cart")')

    // Refresh page
    await page.reload()

    // Verify cart items persist
    await expect(page.locator('.cart-count')).toHaveText('2')
  })

  test('quantity updates', async ({ page }) => {
    await page.goto('http://localhost:3000/marketplace')

    // Add item to cart
    await page.click('.product-card:first-child button:text("Add to Cart")')
    
    // Open cart
    await page.click('button[aria-label="Open cart"]')

    // Increase quantity
    await page.click('.quantity-selector button:text("+")')
    await expect(page.locator('.cart-item:first-child .quantity')).toHaveText('2')

    // Verify total updates
    const initialTotal = await page.locator('.cart-total').textContent()
    await page.click('.quantity-selector button:text("+")')
    const newTotal = await page.locator('.cart-total').textContent()
    expect(initialTotal).not.toEqual(newTotal)
  })

  test('error handling', async ({ page }) => {
    await page.goto('http://localhost:3000/checkout')

    // Submit empty form
    await page.click('text=Continue to Payment')

    // Verify error messages
    await expect(page.locator('text=Full name is required')).toBeVisible()
    await expect(page.locator('text=Street address is required')).toBeVisible()

    // Test invalid card
    await page.fill('input[name="cardNumber"]', '1234')
    await expect(page.locator('text=Invalid card number')).toBeVisible()
  })
})