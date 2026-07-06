const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();

function addTitleSlide(title, subtitle) {
  const s = pptx.addSlide();
  s.addText(title, { x: 0.5, y: 1.2, fontSize: 36, bold: true, color: '363636' });
  s.addText(subtitle, { x: 0.5, y: 2.2, fontSize: 18, color: '666666' });
}

function addFeatureSlide(title, bullets, notes) {
  const s = pptx.addSlide();
  s.addText(title, { x: 0.5, y: 0.4, fontSize: 24, bold: true, color: '1F4E79' });
  s.addText(bullets.map(b => '\u2022 ' + b).join('\n'), { x: 0.5, y: 1.2, fontSize: 14, color: '333333', lineSpacing: 18 });
  if (notes) s.addNotes(notes);
}

addTitleSlide('Dukaan Saathi — Feature Overview', 'Presentation generated automatically');

addFeatureSlide('Authentication (Login / Register)', [
  'Phone-number + PIN flow',
  'Register creates shop profile',
  'Fixed toggle control for quick switching',
  'Client-side validation (recommended)'
], 'Explains the login and registration UX, server token exchange, and where to extend (forgot PIN, OTP).');

addFeatureSlide('Multilingual Support', [
  'i18next integration',
  'Locales: English, Hindi, Telugu',
  'Language switcher available in header'
], 'How translations are loaded and where to add new locales (src/locales).');

addFeatureSlide('Simulator & Webhooks', [
  'WhatsApp simulator for testing messages',
  'Express webhook receiver at /webhooks',
  'Rule-based fallback parser when AI key is missing'
], 'Simulator helps demo Twilio flows without credentials; webhook route lives in server/routes/whatsapp.js.');

addFeatureSlide('Dashboard & Data', [
  'DashboardPage shows shop metrics',
  'Exportable data (CSV suggestion)',
  'Date-range filters and charts (recharts)'
], 'Dashboard uses backend APIs under /api/dashboard; recommend adding CSV export and more charts.');

addFeatureSlide('Voice & STT (Sarvam)', [
  'Optional Sarvam integration for speech-to-text',
  'Feature toggled via flags in server/config.js'
], 'Sarvam keys enable voice notes; safe fallback when missing.');

addFeatureSlide('Twilio WhatsApp Integration', [
  'Incoming webhook processing',
  'Account + authToken config options',
  'Validate Twilio signature (opt-in)'
], 'Twilio settings in environment variables; recommend enabling signature validation in prod.');

addFeatureSlide('Frontend Tech & Dev', [
  'React + Vite + Tailwind',
  'Dev server at http://localhost:5173',
  'Proxy /api to backend during development'
], 'See vite.config.js for proxy rules; run `npm run dev` to start the frontend.');

addFeatureSlide('Backend Tech & Dev', [
  'Express (Node) backend',
  'Runs on port 3001 by default',
  'SQLite via better-sqlite3 for storage'
], 'Run `npm run server` to start with auto-reload.');

addFeatureSlide('UX & Accessibility Suggestions', [
  'Add aria labels and keyboard flows',
  'Improve color contrast for readability',
  'Provide client-side validation and inline errors'
], 'Small UX changes to increase accessibility and conversion.');

addFeatureSlide('Next Improvements (Roadmap)', [
  'Forgot PIN / reset flow',
  'Export/backup shop data',
  'Role-based access and admin UI',
  'Automated tests for critical flows'
], 'Suggested roadmap items and prioritization.');

// Save file
const filename = 'Dukaan-Saathi-Features.pptx';
pptx.writeFile({ fileName: filename }).then(() => {
  console.log('Presentation written:', filename);
}).catch(err => {
  console.error('Failed to write presentation:', err);
});
