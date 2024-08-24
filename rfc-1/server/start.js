const { spawn } = require('child_process');
const path = require('path');

function runCommand(command, args, name, cwd) {
  const process = spawn(command, args, {
    stdio: 'pipe',
    shell: true,
    cwd: cwd
  });

  process.stdout.on('data', (data) => {
    console.log(`[${name}] ${data.toString().trim()}`);
  });

  process.stderr.on('data', (data) => {
    console.error(`[${name} ERROR] ${data.toString().trim()}`);
  });

  process.on('close', (code) => {
    console.log(`[${name}] exited with code ${code}`);
  });

  return process;
}

console.log('Starting blockchain simulation...');

// Start central server
const serverProcess = runCommand('node', ['central_server.js'], 'SERVER', __dirname);

// Give the server a moment to start up
setTimeout(() => {
  // Start miner
  const minerProcess = runCommand('node', ['miner_server.js'], 'MINER', __dirname);

  // Start React client (assuming you're using Create React App)
  const clientProcess = runCommand('npm', ['start'], 'CLIENT', path.join(__dirname, '..'));

  // Handle script termination
  process.on('SIGINT', () => {
    console.log('Stopping all processes...');
    serverProcess.kill();
    minerProcess.kill();
    clientProcess.kill();
    process.exit();
  });
}, 2000);

console.log('All components started. Press Ctrl+C to stop.');
