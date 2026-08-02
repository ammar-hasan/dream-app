import { expect, test } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Socket } from 'node:net';

/**
 * Offline PWA: after the service worker has installed and claimed the page,
 * the whole app must boot with the network gone — the shell comes from the
 * precache (navigations fall back to the cached index.html).
 *
 * "Offline" is REAL here: the test serves dist/ from its own tiny static
 * server and then kills it (sockets destroyed, not just closed). Simulated
 * offline doesn't work for this assertion — under `context.setOffline(true)`
 * or `route.abort()`, Chromium fails SW-intercepted subresource requests
 * with ERR_FAILED even when the worker could answer them from the cache
 * (verified locally; with the server actually dead, the app boots fine).
 */

const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};

function serveDist(): Promise<{ server: Server; port: number; kill(): void }> {
  const sockets = new Set<Socket>();
  const server = createServer((req, res) => {
    const path = req.url === '/' ? '/index.html' : (req.url?.split('?')[0] ?? '/');
    readFile(join(DIST, path)).then(
      (body) => {
        res.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' });
        res.end(body);
      },
      () => {
        res.writeHead(404);
        res.end();
      },
    );
  });
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        server,
        port,
        kill: () => {
          server.close();
          for (const socket of sockets) socket.destroy();
        },
      });
    });
  });
}

test('app boots fully offline once the service worker is active', async ({ page }) => {
  const { port, kill } = await serveDist();
  try {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`http://localhost:${port}/`);
    await expect(page.locator('.splash')).toHaveCount(0);
    await expect(page.locator('.hint-card')).toBeVisible();

    // The worker claims the page on activate (first install), so a controller
    // appears without a reload. Precaching finished before activation.
    await page.waitForFunction(() => !!navigator.serviceWorker?.controller);

    // Pull the plug for real.
    kill();
    await page.reload();

    // Same boot contract as a fresh online visit: splash gone, app interactive.
    await expect(page.locator('.splash')).toHaveCount(0);
    await expect(page.locator('.hint-card')).toBeVisible();
    await expect(page.locator('.viewport-canvas')).toBeVisible();
  } finally {
    kill();
  }
});
