// generateOtp.js

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Path to otps.json
const otpsFile = path.join(__dirname, 'otps.json');

// Function to load existing OTPs
function loadOtps() {
  if (fs.existsSync(otpsFile)) {
    const data = fs.readFileSync(otpsFile, 'utf8');
    try {
      return JSON.parse(data);
    } catch (err) {
      console.error('Error parsing otps.json:', err);
      process.exit(1);
    }
  } else {
    // If otps.json doesn't exist, initialize it
    return {};
  }
}

// Function to save OTPs back to otps.json
function saveOtps(otps) {
  fs.writeFileSync(otpsFile, JSON.stringify(otps, null, 2), 'utf8');
}

// Function to generate a single OTP
function generateOtp() {
  return uuidv4();
}

// Function to generate multiple OTPs
function generateOtps(count = 1) {
  const otps = loadOtps();

  for (let i = 0; i < count; i++) {
    const otp = generateOtp();
    otps[otp] = {
      used: false
    };
    console.log(`Generated OTP: ${otp}`);
  }

  saveOtps(otps);
  console.log(`${count} OTP(s) generated and saved to otps.json.`);
}

// Execute the OTP generation based on command-line arguments
const args = process.argv.slice(2);
const count = parseInt(args[0], 10) || 1;
generateOtps(count);
