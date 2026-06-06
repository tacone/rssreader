import { test, expect } from '@playwright/test';

test('login API returns 200 with valid credentials', async ({ page }) => {
	const response = await page.request.post('/api/auth/sign-in/email', {
		data: { email: 'admin@test.com', password: 'admin123' },
		headers: { 'Content-Type': 'application/json' }
	});
	expect(response.status()).toBe(200);
	const body = await response.json();
	expect(body.token).toBeDefined();
	expect(body.user.email).toBe('admin@test.com');
});

test('login page submits and redirects', async ({ page }) => {
	await page.goto('/login');
	await page.getByPlaceholder('Email').fill('admin@test.com');
	await page.getByPlaceholder('Password').fill('admin123');
	await page.getByRole('button', { name: 'Log in' }).click();
	await page.waitForURL('/dashboard');
	await expect(page.locator('h1')).toContainText('Manage Feeds');
});

test('login with invalid credentials shows error', async ({ page }) => {
	await page.goto('/login');
	await page.getByPlaceholder('Email').fill('admin@test.com');
	await page.getByPlaceholder('Password').fill('wrong-password');
	await page.getByRole('button', { name: 'Log in' }).click();
	await expect(page.getByText('Invalid email or password')).toBeVisible();
});

test('authenticated user redirected from login to dashboard', async ({ page }) => {
	await page.goto('/login');
	await page.getByPlaceholder('Email').fill('admin@test.com');
	await page.getByPlaceholder('Password').fill('admin123');
	await page.getByRole('button', { name: 'Log in' }).click();
	await page.waitForURL('/dashboard');

	await page.goto('/login');
	await expect(page).toHaveURL('/dashboard');
});

test('unauthenticated user redirected from dashboard to login', async ({ page }) => {
	await page.goto('/dashboard');
	await expect(page).toHaveURL('/login');
});
