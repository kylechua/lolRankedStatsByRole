const https = require('https');
const fs = require('fs');

var key = 'RGAPI-5eb441a5-1441-488f-9f67-6ba82b488896';

// Data stores for each role
var TOP;
var JUNGLE;
var MID;
var ADC;
var SUPPORT;
var TOTAL;

var cache = [];

exports.getStats = function(summoner, db){

    // Clear JSON
    TOP = {};
    JUNGLE = {};
    MID = {};
    ADC = {};
    SUPPORT = {};
    TOTAL = {};
    cache = [];

    queryStats(summoner, db);

    // Get ID from summoner name
    var accountID;

    /*
    var query = getID(summoner).then((result)=>{
        accountID = result;
    }).then(() =>{
        // Get Matchlist from account ID
        console.log(accountID);
        getMatches(accountID);
    });
    */

}

function queryStats(summoner, db){
    var accountID;
    return fetchID(summoner).then((result) =>{
        accountID = result;
        console.log("Account ID: " + accountID)
        return fetchMatchlist(accountID, 420);
    }).then((result) =>{
        var matchlist = result;
        return parseMatchlist(accountID, matchlist);
    }).then((result) =>{
        fs.writeFileSync('./cache.json', JSON.stringify(cache));
    });
}

function fetchID(summoner){
    return new Promise((resolve, reject) =>{
        var myRequest = 'https://na1.api.riotgames.com/lol/summoner/v3/summoners/by-name/' + summoner + '?api_key=' + key;
        https.get(myRequest, function(response){
            var body = '';
            response.on('data', (line) =>{
                body += line;
            }).on('end', () =>{
                var res = JSON.parse(body);
                resolve(res.accountId);
            });
        }).on('error', (e) =>{
            reject(false);
        });
    });
}

function fetchMatchlist(id, queues){
    return new Promise((resolve, reject) =>{
        var myRequest = 'https://na1.api.riotgames.com/lol/match/v3/matchlists/by-account/' + id + '?queue=' + queues + '&season=8&api_key=' + key;
        https.get(myRequest, function(response){
            var body = '';
            response.on('data', (line) =>{
                body += line;
            }).on('end', () =>{
                var res = JSON.parse(body);
                resolve(res.matches);
            });
        }).on('error', (e) =>{
            reject(false);
        });
    });
}

function parseMatchlist(id, matches){
    return new Promise((resolve, reject) =>{
        var gameQueries = [];
        for (var a=0; a<matches.length; a++){
            
            var gameID = matches[a].gameId;
            var role = matches[a].lane;
            if (role == "BOTTOM"){
                if (matches[a].role == "DUO_SUPPORT"){
                    role = "SUPPORT";
                } else {
                    role = "ADC";
                }
            }
            // Add match to list of promises
            if (a%20 == 0){
                setTimeout(function(){
                    console.log("Waiting...");
                    gameQueries.push(fetchMatch(id, gameID, role))
                }, 2000);
            }
        }
        // Resolve promise when all games have been parsed
        Promise.all(gameQueries).then(values => {
            resolve(true);
            //console.log(gameQueries)
        }).catch((e) =>{
            reject(false);
        });
    });
}

function fetchMatch(id, gameID, role){
    return new Promise((resolve, reject) =>{
        var myRequest = 'https://na1.api.riotgames.com/lol/match/v3/matches/' + gameID + '?api_key=' + key;
        https.get(myRequest, function(response){
            var body = '';
            response.on('data', (line) =>{
                body += line;
            }).on('end', () =>{
                var res = JSON.parse(body);
                console.log(response.headers)
                /*
                if (res.participantIdentities != undefined){
                    console.log("OK: " + gameID);
                } else {
                    console.log("BAD: " + gameID);
                }
                */
                cache.push(res)
                resolve(true);
            });
        }).on('error', (e) =>{
            reject(false);
        });
    });
}


/*
function parseMatch(id, match){
    var pIdents = match.participantIdentities;
    console.log(pIdents)
    var pID;
    
    for (var i=0; i<; i++){
        var accountID = pIdents[i].player.accountId;
        if (accountID == id){
            pID = pIdents[i].participantId;
            break;
        }
    }
    
    //console.log(pID);
}
*/