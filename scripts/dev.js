#!/usr/bin/env node

// Workaround for Next.js file watcher bug
// Catches the unhandled rejection and allows server to continue

process.on('unhandledRejection', (reason, promise) => {
  if (reason && reason.code === 'ERR_INVALID_ARG_TYPE' && 
      reason.message && reason.message.includes('path.relative')) {
    // Ignore the file watcher error - it's a Next.js bug
    console.warn('⚠️  File watcher warning (non-fatal, ignoring):', reason.message.split('\n')[0]);
    return;
  }
  // Log other errors but don't crash
  console.error('Unhandled rejection:', reason);
});

// Start Next.js dev server
const { spawn } = require('child_process');
const next = spawn('next', ['dev'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    WATCHPACK_POLLING: 'true',
    CHOKIDAR_USEPOLLING: 'true',
    NODE_OPTIONS: '--unhandled-rejections=warn'
  }
});

next.on('close', (code) => {
  process.exit(code);
});

