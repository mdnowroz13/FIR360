import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const keyLine = envFile.split('\n').find(line => line.startsWith('GEMINI_API_KEY='));
const key = keyLine ? keyLine.split('=')[1].trim() : '';

async function run() {
  try {
    const models = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await models.json();
    console.log("Status:", models.status);
    console.log(data.models ? data.models.map(m => m.name).join('\\n') : data);
  } catch(e) {
    console.error(e);
  }
}
run();
