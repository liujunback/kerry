/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require('node:child_process');
require('dotenv').config();

const hostUrl = process.env.SONAR_HOST_URL;
const token = process.env.SONAR_TOKEN;

if (!hostUrl || !token) {
  console.error('Missing SONAR_HOST_URL or SONAR_TOKEN in .env');
  process.exit(1);
}

execSync(
  `npx sonar-scanner -Dsonar.host.url=${hostUrl} -Dsonar.token=${token}`,
  { stdio: 'inherit' }
);
