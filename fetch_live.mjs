import https from 'https';
import fs from 'fs';
https.get('https://dukaan-saathi-new.onrender.com/onboarding', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('live.html', data);
    console.log("Saved live.html");
  });
});
