const http = require('http');
const fs = require('fs');
var scraper = require('./scraper.js');

var server = http.createServer().listen(8080);

// Later, do this all thru server request
var summonerName = 'biur';

// Database which stores exchange rates and modifier
var databaseURL = 'data/' + summonerName + '.json';

var db = {};
db = scraper.getStats(summonerName, db);
fs.writeFileSync(databaseURL, JSON.stringify(db));

/*
// Parse Database
var db;
try {
    db = JSON.parse(fs.readFileSync(databaseURL, 'utf8'));
} catch(e) {
    // Create JSON if file URL is invalid
    db = {};
    db = scraper.getRankedStats(summonerName, db);
    fs.writeFileSync(databaseURL, JSON.stringify(db));
}
*/

/*
// Initialize Server
var server = http.createServer().listen(8888);
*/