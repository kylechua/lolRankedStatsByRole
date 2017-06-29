const http = require('http');
const path = require('path');
const url = require('url');
const fs = require('fs');
const os = require('os');
var scraper = require('./scraper.js');

var server = http.createServer().listen(8082);
console.log("Server is listening on port 8082");
console.log(os.networkInterfaces().address + " on " + os.hostname())

// Get syntax:
// /rankedstats/retrieve/{summonername}?season={season}
server.on('request', function(req, res){
    console.log("Request received.");

    var myURL = url.parse(req.url, true);
    var myPath = path.parse(req.url);
    var pathStr = path.format(myPath);

    if (pathStr.indexOf('/rankedstats') != -1){
        if (pathStr.indexOf('/retrieve/') != -1){

            var season = myURL.query.season;
            var summonerName = path.parse(myURL.pathname).base;

            var databaseURL = './data/summoners/' + summonerName + '_' + season + '.json';
            console.log(databaseURL);
            try {
                var db = JSON.parse(fs.readFileSync(databaseURL, 'utf8'));
                console.log("Found database.")
                sendData(databaseURL, res);
            } catch(e) {
                console.log("Collecting data...");
                res.statusCode = 102;
                res.write("Refresh");
                res.end();
                scraper.getStats(summonerName, season, databaseURL).then(function(result){
                    sendData(databaseURL, res);
                }).catch(function(e){
                    
                });
            }
        }
    } else {
        // Not found, wrong URI
        // response.statusCode = 404;
        res.statusCode = 404;
        res.end();
    }
});

function sendData(databaseURL, res){
    var data = fs.readFileSync(databaseURL, 'utf8');
    res.statusCode = 201;
    res.write(data);
    res.end();
}