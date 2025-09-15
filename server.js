/***************************************************
 * server.js
 ***************************************************/
const express = require('express');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const session = require('express-session');
// const rateLimit = require('express-rate-limit'); // Commented out to disable rate limiting
const morgan = require('morgan');

/** 1) Load environment variables from .env file **/
dotenv.config();

/** 2) AWS S3 Setup **/
const AWS = require('aws-sdk');

// Quick debug log: ensure the region is something like 'us-east-1' or 'us-east-2'
// (NOT 'https://us-east-1' or similar)
console.log('DEBUG: Using AWS_REGION =', process.env.AWS_REGION);

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,   // from .env
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION               // Must be a valid region, e.g. 'us-east-2'
});

// Your private bucket name:
const S3_BUCKET = 'my-otp-files-bucket'; // <--- Replace with your actual bucket name

const app = express();
const PORT = process.env.PORT || 3000;

// Trust the first proxy (e.g., when deploying behind a proxy like ngrok)
app.set('trust proxy', 1);

// Middleware Setup
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('common'));

// Rate Limiting to prevent brute-force attacks
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100,
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: 'Too many requests from this IP, please try again later.'
// });
// app.use(limiter);

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true if using HTTPS
    httpOnly: true,
    maxAge: 60 * 60 * 1000 // 1 hour
  }
}));

/** 3) Load OTPs from otps.json **/
const otpsFile = path.join(__dirname, 'otps.json');
let otps = {};
if (fs.existsSync(otpsFile)) {
  try {
    const data = fs.readFileSync(otpsFile, 'utf8');
    otps = JSON.parse(data);
  } catch (err) {
    console.error('Error parsing otps.json:', err);
    process.exit(1);
  }
} else {
  console.error('OTPs file not found. Please create otps.json.');
  process.exit(1);
}

// Helper function to save OTPs back to otps.json
const saveOtps = () => {
  fs.writeFileSync(otpsFile, JSON.stringify(otps, null, 2), 'utf8');
};

/**
 * 4) Define a folder/file mapping for S3 object keys
 * 
 * 'TEST1' => 'FILE 1': 'myFolder/Duolingo PRO.7z'
 * Adjust as needed to match your S3 storage paths.
 */
const s3FolderMap = {
  
 EBOOK_Golden_Dawn_Magic: {
    'DOWNLOAD': 's3FolderMap/myFolder/Golden Dawn Magic A Complete Guide to the High Magical Arts.pdf',

 },
  
 EBOOK_YOU_BECOME_WHAT_YOU_THINK: {
    'DOWNLOAD': 's3FolderMap/myFolder/You Become What You Think_Shubham Singh.pdf',

 },
  
 EBOOK_THE_CELTIC_GOLDEN_DAWN: {
    'DOWNLOAD': 's3FolderMap/myFolder/The Celtic Golden Dawn_John Michael Greer An Original & Complete Curriculum of Druidical Study-Llewellyn Publications (2013).pdf',

 },
  
 EBOOK_AS_A_MAN_THINKETH: {
    'DOWNLOAD': 's3FolderMap/myFolder/James Allen - As A Man Thinketh-Buynick (2007).pdf',

 },
  
 EBOOK_THE_RIGHTEOUS_MIND: {
    'DOWNLOAD': 's3FolderMap/myFolder/Jonathan Haidt - The Righteous Mind_ Why Good People Are Divided by Politics and Religion-Pantheon (2012).pdf',

 },
  
 EBOOK_Seventy_Eight_Degrees_of_Wisdom: {
    'DOWNLOAD': 's3FolderMap/myFolder/Rachel Pollack - Seventy-Eight Degrees of Wisdom_ A Book of Tarot (1980).pdf',

 },
  
 EBOOK_Breath: {
    'DOWNLOAD': 's3FolderMap/myFolder/JAMES NESTOR - BREATH_ The New Science of a Lost Art-Riverhead Books (2020).pdf',

 },
  
 EBOOK_THE_HAPPINESS_HYPOTHESIS: {
    'DOWNLOAD': 's3FolderMap/myFolder/Jonathan Haidt - Happiness Hypothesis_ Putting Ancient Wisdom to the Test of Modern Science-Arrow Books Ltd (2007).pdf',

 },
  
 EBOOK_BOOK_OF_WISDOM_VOL1: {
    'DOWNLOAD': 's3FolderMap/myFolder/Harry B. Joseph - Book of Wisdom. 1-Revival Of Wisdom.pdf',

 },
  
 EBOOK_BOOK_OF_WISDOM_VOL2: {
    'DOWNLOAD': 's3FolderMap/myFolder/Harry B. Joseph, Revival of Wisdom - Book of Wisdom Volume 2. 2 (2024).pdf',

 },
  
 EBOOK_The_Ancient_Secret_of_the_Flower_of_Life_Vol1: {
    'DOWNLOAD': 's3FolderMap/myFolder/Drunvalo Melchizedek - The Ancient Secret of the Flower of Life, Vol. 1-Light Technology Publishing (1999) (1).pdf',
    

 },
  
 EBOOK_The_Ancient_Secret_of_the_Flower_of_Life_Vol2: {
    'DOWNLOAD': 's3FolderMap/myFolder/Drunvalo Melchizedek - The ancient secret of the Flower of Life. Volume 2 _ an edited transcript of the Flower of Life Workshop presented live to Mother Earth from 1985 to 1994-Light Technology Pub (2.pdf',
    

},
  
 EBOOK_Foundational_Concepts_in_Neuroscience: {
    'DOWNLOAD': 's3FolderMap/myFolder/(The Norton series on interpersonal neurobiology) David E. Presti - Foundational Concepts in Neuroscience_ A Brain-Mind Odyssey-W. W. Norton & Company (2015).pdf',
    

},
  
 EBOOK_The_Molecule_of_More: {
    'DOWNLOAD': 's3FolderMap/myFolder/Daniel Z. Lieberman_ Michael E. Long - The Molecule of More_ How a Single Chemical in Your Brain Drives Love, Sex, and Creativity--and Will Determine the Fate of the Human Race-BenBella Books (20.pdf',
    

},
  
 EBOOK_TPsychedelics_Encyclopedia: {
    'DOWNLOAD': 's3FolderMap/myFolder/Peter Stafford - Psychedelics Encyclopedia-Ronin Publishing (1993).pdf',
    

},
  
 EBOOK_Healing_with_Light_Frequencies: {
    'DOWNLOAD': 's3FolderMap/myFolder/Jerry Sargeant - Healing with Light Frequencies_ The Transformative Power of Star Magic-Inner Traditions_Bear & Company (2020).pdf',
    

},
  
 EBOOK_Sacred_Knowledge_Psychedelics_and_Religious_Experiences: {
    'DOWNLOAD': 's3FolderMap/myFolder/William A. Richards - Sacred Knowledge_ Psychedelics and Religious Experiences-Columbia University Press (2015).pdf',
    

},
  
 EBOOK_The_Psychedelic_Gospels_The_Secret_History_of_Hallucinogens_in_Christianity: {
    'DOWNLOAD': 's3FolderMap/myFolder/Jerry B Brown - The Psychedelic Gospels The Secret History of Hallucinogens in Christianity.pdf',
    

},
  
 EBOOK_NO_GRID_SURVIVAL_PROJECTS_BIBLE: {
    'DOWNLOAD': 's3FolderMap/myFolder/Ranger, Alex J. - NO-GRID SURVIVAL PROJECTS BIBLE_ The Complete Step-by-Step Guide to a safe, self-sufficient home - Become a DIY prepper to live off-grid and overcome crises, disruptions, and disaste.pdf',
    


},
  
 EBOOK_Perfectibilists: {
    'DOWNLOAD': 's3FolderMap/myFolder/Terry Melanson - Perfectibilists_ The 18th Century Bavarian Order of the Illuminati-Trine Day (2011).pdf',
    

},
  
 EBOOK_Ancient_Home_Remedies: {
    'DOWNLOAD': 's3FolderMap/myFolder/Sarafina Cole - Ancient Home Remedies Apothecary Complete Collection 20 Books in 1_ Over 250 Holistic Herbal & Natural Antibiotics for a Non-Toxic Lifestyle (Forgotten Apothecary & the holistic guide .pdf',
    


},
  
 EBOOK_The_Lost_Book_of_Herbal_Remedies: {
    'DOWNLOAD': 's3FolderMap/myFolder/Nicole Apelian - The Lost Book of Herbal Remedies_ The Healing Power of Plant Medicine-Claude Davis (2020).pdf',
    

},
  
 EBOOK_The_Lost_Ways: {
    'DOWNLOAD': 's3FolderMap/myFolder/Claude Davis - The Lost Ways (2018).pdf',
    

},
  
 EBOOK_The_Pineal_Gland_and_Its_Hormones: {
    'DOWNLOAD': 's3FolderMap/myFolder/(NATO ASI Series 277) M. Møller, P. Phansuwan-Pujito, G. Mick (auth.), Franco Fraschini, Russel J. Reiter, Bojidar Stankov (eds.) - The Pineal Gland and Its Hormones_ Fundamentals and Clinical Perspec.pdf',
    


},
  
 EBOOK_The_Kybalion_Centenary_Edition: {
    'DOWNLOAD': 's3FolderMap/myFolder/Author - The Kybalion_ Centenary Edition (2018).pdf',
    

},
  
 EBOOK_The_Secret_School_of_Wisdom: {
    'DOWNLOAD': 's3FolderMap/myFolder/Josef Wages_ Reinhard Markner - The Secret School of Wisdom_ The Authentic Ritual and Doctrines of the Illuminati-Lewis Masonic (2015).pdf',
    

},
  
 EBOOK_The_Secret_Teachings_of_All_Ages: {
    'DOWNLOAD': 's3FolderMap/myFolder/Manly P. Hall, J. Augustus Knapp - The Secret Teachings of All Ages-Wilder Publications (2009).pdf',
    

},
  
 EBOOK_EMOTIONAL_INTELLIGENCE_AND_DARK_PSYCHOLOGY: {
    'DOWNLOAD': 's3FolderMap/myFolder/Angelina Zork - EMOTIONAL INTELLIGENCE AND DARK PSYCHOLOGY_ LEARN THE SECRETS OF MANIPULATION, BRAINWASHING, HYPNOTISM, AND MIND GAMES. IMPROVE YOUR LIFE, RELATIONSHIPS AND ACHIEVE SUCCESS.pdf',
    

},
  
 EBOOK_The_Book_of_Forbidden_Knowledge: {
    'DOWNLOAD': 's3FolderMap/myFolder/- The Book of Forbidden Knowledge_ Black Magic, Superstitions, Charms, Divination, Signs, Omens, Etc.-Johnson Smith & Company.pdf',
    

},
  
 EBOOK_Breaking_The_Habit_of_Being_Yourself: {
    'DOWNLOAD': 's3FolderMap/myFolder/Joe Dispenza Dr. - Breaking The Habit of Being Yourself_ How to Lose Your Mind and Create a New One-Hay House (2012).pdf',
    

},
  
 EBOOK_Frames_Of_Mind_The_Theory_Of_Multiple_Intelligences: {
    'DOWNLOAD': 's3FolderMap/myFolder/Howard E. Gardner - Frames Of Mind_ The Theory Of Multiple Intelligences-Basic Books (1993).pdf',
    

},
  
 EBOOK_Seventy_Eight_Degrees_of_Wisdom_A_Book_of_Tarot: {
    'DOWNLOAD': 's3FolderMap/myFolder/Rachel Pollack - Seventy-Eight Degrees of Wisdom_ A Book of Tarot (1980).pdf',
    

},
  
 EBOOK_Preppers_Guide_to_Surviving_Natural_Disasters: {
    'DOWNLOAD': 's3FolderMap/myFolder/James D. Nowka - Preppers Guide to Surviving Natural Disasters-Living Ready (2013).pdf',
    

},
  
 EBOOK_Preppers_Guide_to_Surviving_Natural_Disasters: {
    'DOWNLOAD': 's3FolderMap/myFolder/James D. Nowka - Preppers Guide to Surviving Natural Disasters-Living Ready (2013).pdf',
    

},
  
 EBOOK_TheSelf_Sufficient_Backyard: {
    'DOWNLOAD': 's3FolderMap/myFolder/Ron Melchiore_ Johanna Melchiore - The Self-Sufficient Backyard (2020).pdf',
    

},
  
 EBOOK_A_Brief_History_of_Humankind: {
    'DOWNLOAD': 's3FolderMap/myFolder/Yuval Noah Harari - Sapiens_ A Brief History of Humankind-Signal Books (2014).pdf',
    

},
  
 EBOOK_The_Art_of_Letting_Go: {
    'DOWNLOAD': 's3FolderMap/myFolder/Nick Trenton - The Art of Letting Go (2024).pdf',
   

},
  
 EBOOK_The_Complete_Guide_to_Astrological_Self_Care: {
    'DOWNLOAD': 's3FolderMap/myFolder/(Complete Illustrated Encyclopedia) Stephanie Gailing - The Complete Guide to Astrological Self-Care_ A Holistic Approach to Wellness for Every Sign in the Zodiac-Wellfleet Press (2021).pdf',
    

},
  
 EBOOK_The_Privileged_Planet: {
    'DOWNLOAD': 's3FolderMap/myFolder/Guillermo Gonzalez, Jay Richards - The Privileged Planet_ How Our Place in the Cosmos Is Designed for Discovery-Regnery Publishing (2004).pdf',
    

},
  
 EBOOK_Dont_Believe_Everything_You_Think: {
    'DOWNLOAD': 's3FolderMap/myFolder/Joseph Nguyen - Dont Believe Everything You Think_ Why Your Thinking Is The Beginning & End Of Suffering-Joseph Nguyen (2022).pdf',
    

},
  
 EBOOK_The_Codex_Leicester: {
    'DOWNLOAD': 's3FolderMap/myFolder/Leonardo Da Vinci - The Codex Leicester.pdf',
    

},
  
 EBOOK_Water_Molecular_Structure_and_Properties: {
    'DOWNLOAD': 's3FolderMap/myFolder/Xiao Feng Pang - Water _ Molecular Structure and Properties-World Scientific Publishing Company (2013).pdf',
    
  }







};

/** 5) Middleware to check if user is authenticated for a specific folder **/
const isAuthenticated = (req, res, next) => {
  const folder = req.params.folder;
  if (req.session && req.session.downloadFolders && req.session.downloadFolders.includes(folder)) {
    next();
  } else {
    res.status(403).send('Access denied. You need a valid OTP to download from this folder.');
  }
};

// Route: Homepage - Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/** 6) /api/folders - Return the S3 folder names from s3FolderMap **/
app.get('/api/folders', async (req, res) => {
  try {
    const folders = Object.keys(s3FolderMap);
    res.json({ folders });
  } catch (err) {
    console.error('Error retrieving folder list:', err);
    res.status(500).json({ error: 'Unable to retrieve folders.' });
  }
});

// Route: Handle OTP Submission
app.post('/authenticate', (req, res) => {
  const { otp, folder } = req.body;

  if (!otp || !folder) {
    return res.send('OTP and Folder are required. <a href="/">Go back</a>');
  }

  // Check if OTP exists
  if (otps.hasOwnProperty(otp)) {
    const otpData = otps[otp];

    // Check if OTP is already used
    if (otpData.used) {
      return res.send('This CODE has already been used. <a href="/">Go back</a>');
    }

    // Mark OTP as used
    otps[otp].used = true;
    saveOtps();

    // Initialize downloadFolders array in session if not present
    if (!req.session.downloadFolders) {
      req.session.downloadFolders = [];
    }

    // Add the requested folder to the session's downloadFolders
    req.session.downloadFolders.push(folder);

    // Redirect to the download page for the folder
    return res.redirect(`/download/${encodeURIComponent(folder)}`);
  } else {
    return res.send('𓂀 I . N . V . A . L . I . D 💲1 CODE <a href="/">Return Home</a>');
  }
});

/**
 * 7) /download/:folder - Show a list of files for that folder.
 *    Each link leads to /download/:folder/:file,
 *    which will generate a presigned URL.
 */
app.get('/download/:folder', isAuthenticated, async (req, res) => {
  const folder = req.params.folder;

  // Check if this folder exists in s3FolderMap
  if (!s3FolderMap[folder]) {
    return res.status(404).send('Folder not found in S3 folder map.');
  }

  try {
    const files = Object.keys(s3FolderMap[folder]);
    if (files.length === 0) {
      return res.send(`
        <style>
          body {
            font-family: 'Orbitron', sans-serif;
            color: #0ff;
            font-size: 1.5em;
            text-shadow: 0 0 5px #0ff, 0 0 10px #ff0, 0 0 15px #f0f;
          }
        </style>
        <p>No files available in this folder.</p>
        <a href="/">Back to Home</a>
      `);
    }

    let fileList = `
      <style>
        body {
          font-family: 'Orbitron', sans-serif;
          color: #0ff;
          font-size: 1.5em;
          text-shadow: 0 0 5px #0ff, 0 0 10px #ff0, 0 0 15px #f0f;
        }
        a {
          color: #ff0;
          text-decoration: none;
        }
        a:hover {
          color: #f0f;
        }
      </style>
      <h1>🎉🎉🎉THANK YOU🎉🎉🎉:</h1>
      <ul>
    `;

    files.forEach((file) => {
      const encodedFile = encodeURIComponent(file);
      fileList += `<li><a href="/download/${encodeURIComponent(folder)}/${encodedFile}" download>${file}</a></li>`;
    });

    fileList += `</ul><a href="/">Back to Home</a>`;
    res.send(fileList);
  } catch (err) {
    console.error('Error listing files from S3 folder map:', err);
    res.send('Unable to access folder. <a href="/">Go back</a>');
  }
});

/**
 * 8) /download/:folder/:file - Generate a short-lived presigned URL to the
 *    requested S3 object, then redirect the user to it.
 */
app.get('/download/:folder/:file', isAuthenticated, (req, res) => {
  const folder = req.params.folder;
  const file = req.params.file;

  // Prevent directory traversal attacks
  if (file.includes('..') || folder.includes('..')) {
    return res.status(400).send('Invalid file path.');
  }

  // If this folder or file doesn't exist in s3FolderMap:
  if (!s3FolderMap[folder] || !s3FolderMap[folder][file]) {
    return res.status(404).send('File not found in S3 folder map.');
  }

  // The actual S3 object key:
  const s3Key = s3FolderMap[folder][file];

  // Generate a short-lived presigned URL (e.g., 60 seconds)
  const params = {
    Bucket: S3_BUCKET,
    Key: s3Key,
    Expires: 60 // seconds
  };

  // Debug log the S3 Key & Bucket to confirm correctness
  console.log(`DEBUG: Generating presigned URL for Bucket='${S3_BUCKET}', Key='${s3Key}'`);

  s3.getSignedUrl('getObject', params, (err, presignedURL) => {
    if (err) {
      console.error('Error generating presigned URL:', err);
      return res.status(500).send('Error generating download link.');
    }
    console.log('DEBUG: Presigned URL:', presignedURL); // Inspect this in logs
    return res.redirect(presignedURL);
  });
});

// Route: Logout - Destroy Session
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Error logging out.');
    }
    res.redirect('/');
  });
});

/** 9) Fancy logs and start the server **/
console.log('\x1b[36m%s\x1b[0m', '=======================================');
console.log('\x1b[35m%s\x1b[0m', '   O . N . E   D . O . L . L . A . R   ');
console.log('\x1b[35m%s\x1b[0m', '              S E R V E R             ');
console.log('\x1b[36m%s\x1b[0m', '=======================================');
console.log('\x1b[32m%s\x1b[0m', 'R E A D Y   T O   S E R V E   Y O U R   N E O N   N E E D S!');
console.log('\x1b[33m%s\x1b[0m', '---------------------------------------');

app.listen(PORT, () => {
  console.log('\x1b[36m%s\x1b[0m', `S E R V E R   R U N N I N G   O N   \x1b[35mhttp://localhost:${PORT}\x1b[0m`);
});
