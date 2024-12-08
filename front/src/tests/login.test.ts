import { test, expect } from '@playwright/test';

test.describe('Login Page Tests', () => {
    test('should login successfully with valid credentials', async ({ page }) => {

    await page.goto('http://localhost:3000');

    await page.fill('input[name="testUsername"]', 'validUser');
    await page.fill('input[name="testPassword"]', 'validPassword');

    await page.check('input[name="testCheckbox"]');

    await page.click('button[name="submitButton"]');

    await expect(page).toHaveURL('http://localhost:3000'); 

    const token = await page.evaluate(() => localStorage.getItem('authToken'));
    expect(token).not.toBeNull();
    });

    test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:3000');

    await page.fill('input[name="testUsername"]', 'invalidUser');
    await page.fill('input[name="testPassword"]', 'invalidPassword');

    await page.click('button[name="submitButton"]');

    const errorMessage = await page.locator('#error');
    await expect(errorMessage).toHaveText('Invalid username or password.');

    const token = await page.evaluate(() => localStorage.getItem('authToken'));
    expect(token).toBeNull();
    });
});