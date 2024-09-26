const fs = require("fs");
const yaml = require("yaml");
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");

const app = express();
const port = 3000;
const yamlFilePath = 'public/logs.yml';

app.use(express.static('public'));

// Set EJS as the templating engine
app.set('view engine', 'ejs');

// Middleware to parse form data (POST requests)
app.use(bodyParser.urlencoded({ extended: true }));

// Session middleware
app.use(session({
    secret: 'hamlogger-secret', // Replace with a stronger secret in production
    resave: false,
    saveUninitialized: true
}));

// Load or create YAML data
let yamlData = {};
if (fs.existsSync(yamlFilePath)) {
    const fileContent = fs.readFileSync(yamlFilePath, 'utf8');
    yamlData = yaml.parse(fileContent) || {};
} else {
    yamlData = { users: {} };
}

// Serve the HTML page and pass logs to the template
app.get('/', (req, res) => {
    const username = req.session.username;

    if (!username) {
        // Render the username form if not logged in
        return res.render('username'); // New EJS template for username input
    }

    // Fetch logs for the logged-in user
    const userLogs = yamlData.users[username]?.logs || [];

    // Render the EJS template and pass the user's logs data and session
    res.render('index', { logs: userLogs, session: req.session });
});

// Handle username submission
app.post('/set-username', (req, res) => {
    const username = req.body.username;

    if (!yamlData.users[username]) {
        console.log(`Creating account for ${username}`);
        yamlData.users[username] = { logs: [] };
        const newYamlContent = yaml.stringify(yamlData);
        fs.writeFileSync(yamlFilePath, newYamlContent);
    } else {
        console.log(`Welcome back, ${username}!`);
    }

    // Store the username in session
    req.session.username = username;

    // Redirect to the main page to log information
    res.redirect('/');
});

// Handle the form submission for logging
app.post('/log', (req, res) => {
    const username = req.session.username;
    const callsign = req.body.callsign;
    const state = req.body.state;
    const signal = req.body.signal;

    // Ensure the user's log exists
    if (!yamlData.users[username]) {
        yamlData.users[username] = { logs: [] };
    }

    // Capture the current date and time
    const now = new Date();
    const dateTime = now.toLocaleString(); // Format as per your locale

    // Add the new entry (Callsign, State, Signal, Date/Time) to the user's logs
    yamlData.users[username].logs.push({
        callsign: callsign,
        state: state,
        signal: signal,
        dateTime: dateTime // Add the dateTime
    });

    // Convert the updated object back to YAML and save to file
    const newYamlContent = yaml.stringify(yamlData);
    fs.writeFileSync(yamlFilePath, newYamlContent);

    console.log(`Logged for user "${username}": Callsign: "${callsign}", State: "${state}", Signal: "${signal}", Date/Time: "${dateTime}"`);

    // Redirect back to the main page to see the updated logs
    res.redirect('/');
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
