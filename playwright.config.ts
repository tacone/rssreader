import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'bun run src/lib/server/seed/create-user.ts && bunx vite dev --port 5173 --host',
		port: 5173,
		env: { ORIGIN: 'http://localhost:5173' },
		reuseExistingServer: true
	},
	testDir: 'tests',
	testMatch: '**/*.e2e.{ts,js}'
});
