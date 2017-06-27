const http = require('http');
const https = require('https');
const fs = require('fs');

// Data stores for each role
var TOP;
var JUNGLE;
var MID;
var ADC;
var SUPPORT;
var TOTAL;

exports.getStats = function(summoner, db){

    // Clear JSON
    TOP = {};
    JUNGLE = {};
    MID = {};
    ADC = {};
    SUPPORT = {};
    TOTAL = {};

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
    return getID(summoner).then((result) =>{
        accountID = result;
        console.log("Account ID: " + accountID)
        return getMatches(accountID, 420);
    }).then((result) =>{
        var matchlist = result;
        console.log("Matches: " + matchlist.length)
        return parseMatchlist(accountID, matchlist);
    }).then((result) =>{
        if (result)
        console.log(result);
    });
}

function getID(summoner){
    return new Promise((resolve, reject) =>{
        var myRequest = 'https://na1.api.riotgames.com/lol/summoner/v3/summoners/by-name/' + summoner + '?api_key=RGAPI-e85d55f3-149a-44e5-a49d-34b08957b8d7';
        https.get(myRequest, function(response){
            var body = '';
            response.on('data', (line) =>{
                body += line;
            }).on('end', () =>{
                var res = JSON.parse(body);
                resolve(res.accountId);
            });
        }).on('error', (e) =>{
            reject(-1);
        });
    });
}

function getMatches(id, queues){
    return new Promise((resolve, reject) =>{
        var myRequest = 'https://na1.api.riotgames.com/lol/match/v3/matchlists/by-account/' + id + '?queue=' + queues + '&season=8&api_key=RGAPI-e85d55f3-149a-44e5-a49d-34b08957b8d7';
        https.get(myRequest, function(response){
            var body = '';
            response.on('data', (line) =>{
                body += line;
            }).on('end', () =>{
                var res = JSON.parse(body);
                resolve(res.matches);
            });
        }).on('error', (e) =>{
            reject(-1);
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
            gameQueries.push(parseMatch(id, gameID, role))
        }

        // Resolve promise when all games have been parsed
        Promise.all(gameQueries).then(values => {
            resolve(true);
        }).catch((e) =>{
            reject(false);
        });
    });
}

function parseMatch(id, gameID, role){
    return new Promise((resolve, reject) =>{
        setTimeout(resolve(true), 100);
    });
}