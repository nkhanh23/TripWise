const { execSync } = require('child_process');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  console.log("Starting measurement...");
  const samples = [];
  
  for (let i = 0; i < 5; i++) {
    console.log(`Run ${i + 1}/5...`);
    // Clear logcat
    execSync('adb logcat -c');
    
    // Restart app
    execSync('cmd /c "adb shell am force-stop com.anonymous.tripwisemobile && adb shell monkey -p com.anonymous.tripwisemobile -c android.intent.category.LAUNCHER 1"');
    
    // Wait for it to boot and log
    await sleep(6000);
    
    // Get logs
    const logOutput = execSync('adb logcat -d -s "ReactNativeJS" "ReactNative"').toString();
    const lines = logOutput.split('\\n');
    
    let auth = null;
    let shell = null;
    let profileStart = null;
    let profileEnd = null;
    
    for (const line of lines) {
      if (line.includes('[PERF] AUTH_SESSION_READY')) {
        auth = parseFloat(line.split(' ').pop());
      }
      if (line.includes('[PERF] APP_SHELL_READY')) {
        shell = parseFloat(line.split(' ').pop());
      }
      if (line.includes('[PERF] PROFILE_FETCH_START')) {
        profileStart = parseFloat(line.split(' ').pop());
      }
      if (line.includes('[PERF] PROFILE_FETCH_END')) {
        profileEnd = parseFloat(line.split(' ').pop());
      }
    }
    
    if (auth && shell) {
      samples.push({
        auth,
        shell,
        profileStart,
        profileEnd,
        shellDelay: shell - auth,
        profileDelay: profileEnd ? (profileEnd - profileStart) : null
      });
      console.log(`Sample ${i + 1}: shellDelay=${shell - auth}ms`);
    } else {
      console.log(`Sample ${i + 1}: Missing markers!`);
    }
  }
  
  console.log("Results:");
  console.log(JSON.stringify(samples, null, 2));
}

run().catch(console.error);
