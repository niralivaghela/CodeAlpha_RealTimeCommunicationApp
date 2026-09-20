const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const exePath = path.resolve(__dirname, '..', 'dist', 'win-unpacked', 'Nexora Connect.exe');
const iconPath = path.resolve(__dirname, '..', 'build', 'icon.ico');
const workingDir = path.resolve(__dirname, '..', 'dist', 'win-unpacked');

if (!fs.existsSync(exePath)) {
  console.error(`Error: Target executable not found at: ${exePath}`);
  process.exit(1);
}

const userProfile = process.env.USERPROFILE || 'C:\\Users\\hp';
const desktopPath = path.join(userProfile, 'Desktop', 'Nexora Connect.lnk');
const startMenuDir = path.join(userProfile, 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs');
const startMenuPath = path.join(startMenuDir, 'Nexora Connect.lnk');

function createShortcut(shortcutPath) {
  // Write temporary PowerShell script to avoid escaping issues
  const tempPs1 = path.join(__dirname, 'temp-shortcut.ps1');
  const psContent = `
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("${shortcutPath.replace(/\\/g, '\\\\')}")
$Shortcut.TargetPath = "${exePath.replace(/\\/g, '\\\\')}"
$Shortcut.WorkingDirectory = "${workingDir.replace(/\\/g, '\\\\')}"
$Shortcut.IconLocation = "${iconPath.replace(/\\/g, '\\\\')},0"
$Shortcut.Description = "Nexora Connect - Connect. Collaborate. Communicate."
$Shortcut.Save()
`;
  fs.writeFileSync(tempPs1, psContent, 'utf8');

  try {
    execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempPs1}"`, { stdio: 'inherit' });
    console.log(`✅ Shortcut created: ${shortcutPath}`);
  } finally {
    if (fs.existsSync(tempPs1)) fs.unlinkSync(tempPs1);
  }
}

console.log('Creating Windows Desktop and Start Menu shortcuts for Nexora Connect...');
createShortcut(desktopPath);

if (fs.existsSync(startMenuDir)) {
  createShortcut(startMenuPath);
}

console.log('All shortcuts successfully registered with custom application icon!');
