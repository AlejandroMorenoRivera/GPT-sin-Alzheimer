const { spawn } = require('child_process');
const path = require('path');

function iniciarBackend() {
  const backendPath = path.join(__dirname, '..', 'app', 'index.js');
  const backend = spawn('node', [backendPath]);

  backend.stdout.on('data', (data) => console.log(`[Backend] ${data}`));
  backend.stderr.on('data', (data) => console.error(`[Backend ERROR] ${data}`));
  backend.on('exit', (code) => console.log(`[Backend] Cerrado con código ${code}`));

  return backend;
}

function detenerBackend(backend) {
  backend.kill();
}

module.exports = { iniciarBackend, detenerBackend };
