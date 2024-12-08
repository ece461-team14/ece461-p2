import { test, expect } from '@playwright/test';

test.describe('Signup Page Tests', () => {
    test('should go to login successfully with valid signup credentials', async ({ page }) => {

    await page.goto('http://localhost:3000');

    await page.click('button[name="signupButton"]');

    await page.fill('input[name="signupUsername"]', 'validUser');
    await page.fill('input[name="signupPassword"]', 'validPassword');
    await page.fill('input[name="signupPassword2"]', 'validPassword');

    await page.click('button[name="signupSubmit"]');

    await expect(page).toHaveURL('http://localhost:3000'); 

    // const token = await page.evaluate(() => localStorage.getItem('authToken'));
    // expect(token).not.toBeNull();
    });

    test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('button[name="signupButton"]');

    await page.fill('input[name="signupUsername"]', 'validUser');
    await page.fill('input[name="signupPassword"]', 'pass');
    await page.fill('input[name="signupPassword2"]', 'pass');

    await page.click('button[name="signupSubmit"]');

    const errorMessage = await page.locator('#signupError');
    await expect(errorMessage).toHaveText('Password must be at least 5 characters long.');

    // const token = await page.evaluate(() => localStorage.getItem('authToken'));
    // expect(token).toBeNull();
    });
});