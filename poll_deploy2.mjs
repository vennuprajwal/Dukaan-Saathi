import https from 'https';
const url = 'https://dukaan-saathi-new.onrender.com/onboarding';
const targetHash = 'index-Ctlfeqa-.js';

function poll() {
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (data.includes(targetHash)) {
        console.log("Deployment SUCCESS! New hash found.");
        process.exit(0);
      } else {
        console.log("Still serving old version. Polling again in 15 seconds...");
        setTimeout(poll, 15000);
      }
    });
  }).on('error', (err) => {
    console.log("Error fetching:", err.message);
    setTimeout(poll, 15000);
  });
}

console.log("Polling for new deployment...");
poll();
