import { test, expect, chromium, type BrowserContext, type Page, type Request } from '@playwright/test';
import { join } from 'path';

// Proof tests: the packed extension must make ZERO external network requests —
// while idling, while the popup UI is used, and while real downloads are running.
const EXTENSION_DIR = join(process.cwd(), 'dist');
const TEST_ORIGIN = 'http://localhost:8080';

async function launch() {
  const context: BrowserContext = await chromium.launchPersistentContext('', {
    // Extensions only load in the full Chromium build (new headless mode).
    channel: 'chromium',
    headless: true,
    args: [`--disable-extensions-except=${EXTENSION_DIR}`, `--load-extension=${EXTENSION_DIR}`],
  });
  return context;
}

function trackExternal(context: BrowserContext): string[] {
  const external: string[] = [];
  context.on('request', (request: Request) => {
    const url = request.url();
    if (
      !url.startsWith('chrome-extension://') &&
      !url.startsWith('devtools://') &&
      !url.startsWith(TEST_ORIGIN) &&
      !url.startsWith('chrome://') &&
      !url.startsWith('chromewebdata')
    ) {
      external.push(url);
    }
  });
  return external;
}

async function openPopup(context: BrowserContext): Promise<Page> {
  let [sw] = context.serviceWorkers();
  if (!sw) {
    sw = await context.waitForEvent('serviceworker', { timeout: 10000 });
  }
  const extensionId = new URL(sw.url()).host;
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/src/popup.html`);
  return page;
}

test('popup renders, filters, confirms clear — with zero external requests', async () => {
  const context = await launch();
  const external = trackExternal(context);

  const page = await openPopup(context);
  const root = page.locator('.td-root');
  await expect(root).toBeVisible();

  // empty state on a fresh profile
  await expect(page.locator('#empty')).toBeVisible();

  // filter chips toggle selection
  await page.locator('.td-chip[data-filter="done"]').click();
  await expect(page.locator('.td-chip[data-filter="done"]')).toHaveAttribute('aria-selected', 'true');
  await page.locator('.td-chip[data-filter="all"]').click();
  await expect(page.locator('.td-chip[data-filter="all"]')).toHaveAttribute('aria-selected', 'true');

  // theme cycles auto -> light -> dark
  const themeBtn = page.locator('#btn-theme');
  await themeBtn.click(); // light
  await expect(themeBtn).toHaveText('Light');
  await expect(root).toHaveAttribute('data-theme', 'light');
  await themeBtn.click(); // dark
  await expect(themeBtn).toHaveText('Dark');
  await expect(root).toHaveAttribute('data-theme', 'dark');

  // clear-all confirmation modal opens and cancels cleanly
  await page.locator('#btn-clear').click();
  await expect(page.locator('#modal')).toBeVisible();
  await page.locator('#modal-cancel').click();
  await expect(page.locator('#modal')).toBeHidden();

  expect(external).toEqual([]);
  await context.close();
});

test('real download appears in list, delete asks confirmation — zero external requests', async () => {
  const context = await launch();
  const external = trackExternal(context);

  // trigger a real same-origin download from a normal page
  const dlPage = await context.newPage();
  await dlPage.goto(`${TEST_ORIGIN}/download.html`);
  await dlPage.locator('#dl').click();
  await dlPage.waitForTimeout(1500); // let the download settle (1 KB file)
  await dlPage.close();

  const page = await openPopup(context);
  const root = page.locator('.td-root');
  await expect(root).toBeVisible();

  // NOTE: under Playwright, CDP's Browser.setDownloadBehavior (allowAndName) renames
  // the downloaded file to a GUID — that is a test-harness artifact, not an extension
  // bug. So we assert "one completed download row appeared", not the literal filename.
  const row = page.locator('.td-item').first();
  await expect(row).toBeVisible({ timeout: 10000 });
  await expect(row.locator('.td-meta')).toContainText('Done');

  // delete asks for confirmation, then removes the row
  await row.locator('.td-act[title="Delete"]').click();
  await expect(page.locator('#modal')).toBeVisible();
  await page.locator('#modal-ok').click();
  await expect(page.locator('.td-item')).toHaveCount(0);

  expect(external).toEqual([]);
  await context.close();
});
