const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectId = "15721947540492583785";
const apiKey = process.env.STITCH_API_KEY || "";

const outputDir = path.join(__dirname, '..', '.stitch', 'designs');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log("Starting dynamic sync from Stitch...");

try {
  // Call list_screens tool
  const listCmd = `npx.cmd @_davideast/stitch-mcp tool list_screens --data "{\\"projectId\\": \\"${projectId}\\"}"`;
  console.log("Fetching project screens list...");
  const listOutput = execSync(listCmd, {
    env: { ...process.env, STITCH_API_KEY: apiKey },
    encoding: 'utf-8',
    maxBuffer: 20 * 1024 * 1024 // 20MB buffer
  });

  const listData = JSON.parse(listOutput.trim());
  if (!listData || !listData.screens) {
    console.error("❌ Failed to list screens. Response was empty or invalid.");
    process.exit(1);
  }

  const screens = listData.screens;
  console.log(`Found ${screens.length} screens in project.`);

  screens.forEach((screen) => {
    // Screen name is in format: projects/{projectId}/screens/{screenId}
    const screenNameParts = screen.name.split('/');
    const screenId = screenNameParts[screenNameParts.length - 1];
    const screenTitle = screen.title || screenId;

    console.log(`Fetching screen: "${screenTitle}" (${screenId})...`);
    try {
      const dataArg = JSON.stringify({ projectId, screenId }).replace(/"/g, '\\"');
      const cmd = `npx.cmd @_davideast/stitch-mcp tool get_screen_code --data "${dataArg}"`;
      
      const output = execSync(cmd, {
        env: { ...process.env, STITCH_API_KEY: apiKey },
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024
      });

      const parsed = JSON.parse(output.trim());
      if (parsed && parsed.htmlContent) {
        // Save using screenId
        const htmlPath = path.join(outputDir, `${screenId}.html`);
        fs.writeFileSync(htmlPath, parsed.htmlContent);
        
        // Also save a friendly named copy if title is available
        if (screen.title) {
          const friendlyName = screen.title.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '.html';
          const friendlyPath = path.join(outputDir, friendlyName);
          fs.writeFileSync(friendlyPath, parsed.htmlContent);
          console.log(`  ✅ Saved HTML to ${htmlPath} and friendly name ${friendlyPath}`);
        } else {
          console.log(`  ✅ Saved HTML to ${htmlPath}`);
        }
      } else {
        console.error(`  ❌ Failed to parse HTML content for screen ${screenId}`);
      }
    } catch (error) {
      console.error(`  ❌ Error fetching screen ${screenId}:`, error.message);
    }
  });

  console.log("All screens synchronized successfully!");
} catch (error) {
  console.error("❌ Error listing screens from project:", error.message);
}
