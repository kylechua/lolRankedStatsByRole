const http = require('http');
const path = require('path');
const url = require('url');
const fs = require('fs');
var scraper = require('./scraper.js');

var server = http.createServer().listen(8080);

// Database which stores exchange rates and modifier
var db;

server.on('request', function(req, res){
    var myURL = url.parse(req.url, true);
    var myPath = path.parse(req.url);
    var pathStr = path.format(myPath);

    if (pathStr.indexOf('/rankedstats') != -1){
        if (pathStr.indexOf('/retrieve/') != -1){

            var queueTypes = myURL.query.queue;
            var queues;
            if (queueTypes == "flex"){
                queues = [440];
            } else if (queueTypes == "solo"){
                queues = [420];
            } else {
                queues = [420,440];
            }

            var summonerName = path.parse(myURL.pathname).base;
            var databaseURL = 'data/summoners/' + summonerName + '.json';
            console.log(databaseURL);
            try {
                db = JSON.parse(fs.readFileSync(databaseURL, 'utf8'));
                console.log("Found database.")
                sendData(db, res);
            } catch(e) {
                console.log(e)
                scraper.getStats(summonerName, queues, db).then((result) =>{
                    db = result;
                    fs.writeFileSync(databaseURL, JSON.stringify(db));
                    sendData(db, res);
                }).catch(function(e){
                    console.log("Unable to retrieve stats.");
                });
            }
        }
    } else {
        // Not found, wrong URI
        // response.statusCode = 404;
    }
    res.end();
});

function sendData(db, res){
    var data = JSON.stringify(db);
    res.write(data);
}