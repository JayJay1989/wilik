// Launches the backend dev server using its own venv's Python, whose path differs
// per OS (Windows: .venv/Scripts/python.exe, macOS/Linux: .venv/bin/python) -- this
// lets `npm run dev` stay a single cross-platform command in package.json.
const { spawnSync } = require('child_process')
const path = require('path')

// relative to `cwd` below, not to this script's own location
const pythonPath = path.join(
  '.venv',
  process.platform === 'win32' ? 'Scripts' : 'bin',
  process.platform === 'win32' ? 'python.exe' : 'python'
)

const result = spawnSync(pythonPath, ['app.py'], { cwd: 'backend', stdio: 'inherit' })
process.exit(result.status ?? 1)
