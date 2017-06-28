const http = require('http');
const fs = require('fs');
var scraper = require('./scraper.js');

var server = http.createServer().listen(8080);

// Later, do this all thru server request
var summonerName = 'KyIe Chua';
var queueTypes = [420,440];

// Database which stores exchange rates and modifier
var databaseURL = 'data/summoners/' + summonerName + '.json';

var db = {};
scraper.getStats(summonerName, queueTypes, db).then((result) =>{
    db = result;
    fs.writeFileSync(databaseURL, JSON.stringify(db));
});

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