const https = require('https');
const fs = require('fs');
const keygen = require('./api.js');

const APIKEY = keygen.getKey();

// Data stores for each role

var cache = {
        solo: {
            TOP: undefined,
            JUNGLE: undefined,
            MID: undefined,
            ADC: undefined,
            SUPPORT: undefined,
            TOTAL: undefined
        },
        flex: {
            TOP: undefined,
            JUNGLE: undefined,
            MID: undefined,
            ADC: undefined,
            SUPPORT: undefined,
            TOTAL: undefined
        }
    };

var matchlist = [];

exports.getStats = function(summoner, season, databaseURL){

    return new Promise(function(resolve, reject) {
        // Clear cache
        cache.solo.TOP = {games:0,wins:0,kills:0,deaths:0,assists:0};
        cache.solo.JUNGLE = {games:0,wins:0,kills:0,deaths:0,assists:0};
        cache.solo.MID = {games:0,wins:0,kills:0,deaths:0,assists:0};
        cache.solo.ADC = {games:0,wins:0,kills:0,deaths:0,assists:0};
        cache.solo.SUPPORT = {games:0,wins:0,kills:0,deaths:0,assists:0};
        cache.solo.TOTAL = {games:0,wins:0,kills:0,deaths:0,assists:0};

        cache.flex.TOP = {games:0,wins:0,kills:0,deaths:0,assists:0};
        cache.flex.JUNGLE = {games:0,wins:0,kills:0,deaths:0,assists:0};
        cache.flex.MID = {games:0,wins:0,kills:0,deaths:0,assists:0};
        cache.flex.ADC = {games:0,wins:0,kills:0,deaths:0,assists:0};
        cache.flex.SUPPORT = {games:0,wins:0,kills:0,deaths:0,assists:0};
        cache.flex.TOTAL = {games:0,wins:0,kills:0,deaths:0,assists:0};

        matchlist = [];

        queryStats(summoner, season, databaseURL).then(function(result) {
            resolve(result);
        });
    });
    

}

function queryStats(summoner, season, databaseURL){

    return new Promise(function(resolve, reject) {
        var accountID;
        var numGames;
        console.log("--------------------")
        console.log(summoner)

        fetchID(summoner).then(function(result) {
            accountID = result;
            console.log("Account ID: " + accountID);
            return fetchMatchlist(accountID, season);
        }).then(function(result) {
            var matchlist = result;
            numGames = matchlist.length
            console.log("Games Played: " + numGames);
            console.log("--------------------");
            return parseMatchlist(accountID, matchlist);
        }).then(function(result) {
            var gameQueries = result;
            return fetchMatches(accountID, gameQueries, numGames, databaseURL)
        }).then(function(result) {
            console.log("--------------------");
            console.log("Query Completed. " + numGames + " games parsed.");
            resolve(cache);
        }).catch(function(e){
            console.log(e);
            reject();
        });
    });
}

function fetchID(summoner){
    return new Promise(function(resolve, reject) {
        var myRequest = 'https://na1.api.riotgames.com/lol/summoner/v3/summoners/by-name/' + summoner + '?api_key=' + APIKEY;
        https.get(myRequest, function(response){
            var body = '';
            response.on('data', function(line) {
                body += line;
            }).on('end', function() {
                var res = JSON.parse(body);
                resolve(res.accountId);
            });
        }).on('error', function(e) {
            reject(false);
        });
    });
}

function fetchMatchlist(accountID, season){

    return new Promise(function(resolve, reject) {
        var myRequest = 'https://na1.api.riotgames.com/lol/match/v3/matchlists/by-account/' + accountID + '?season=' + season + '&api_key=' + APIKEY;
        https.get(myRequest, function(response){
            var body = '';
            response.on('data', function(line) {
                body += line;
            }).on('end', function() {
                var thisList = JSON.parse(body);
                var matchlist = thisList.matches;
                resolve(matchlist);
            }).on('error', function(e) {
                console.log(e);
                reject();
            });
        });
    });
}

function parseMatchlist(id, matches){

    return new Promise(function(resolve, reject) {
        var gameQueries = [];
        for (var a=0; a<matches.length; a++){
            var gameID = matches[a].gameId;
            var role = matches[a].lane;
            var queueType = matches[a].queue;
            if (role == "BOTTOM"){
                if (matches[a].role == "DUO_SUPPORT"){
                    role = "SUPPORT";
                } else {
                    role = "ADC";
                }
            }
            var query = {
                matchID: gameID,
                playerRole: role,
                queue: queueType
            };
            gameQueries.push(query)
        }

        resolve(gameQueries);
    });
}

function fetchMatches(accountID, gameQueries, numGames, databaseURL){

    return new Promise(function(resolveOuter, rejectOuter) {
        var i = 0;
        var numQueries = gameQueries.length;
        var delay = 1250;
        var queries = [];
        var last = false;

        var fetchMatch = setInterval(function(){
            var gameID = gameQueries[i].matchID;
            var role = gameQueries[i].playerRole;
            var queueType = gameQueries[i].queue;

            var myRequest = 'https://na1.api.riotgames.com/lol/match/v3/matches/' + gameID + '?api_key=' + APIKEY;

            var query = new Promise(function(resolve,reject) {
                queries.push(query);
                https.get(myRequest, function(response){
                    var body = '';
                    response.on('data', function(line) {
                        body += line;
                    }).on('end', function() {
                        var match = JSON.parse(body);
                        if (match.gameId == gameID){
                            console.log("("+(i+1)+" of "+numGames+")");
                            var parser = parseMatch(accountID, role, queueType, match, databaseURL).then(function() {
                                i++;
                                resolve();
                                if (last){
                                    resolveOuter();
                                }
                            });
                        } else {
                            console.log(i + ": ERROR. Trying again in " + delay + "ms.");
                        }
                    }).on('error', function(e) {
                        reject();
                    });
                })
            });
            if (i == numQueries-1){
                clearInterval(fetchMatch);
                last = true;
            }

        }, delay);
    });

}

function parseMatch(accountID, role, queueType, match, databaseURL){

    return new Promise(function(resolve, reject) {

        // get pariticipantID matching with this account
        var pID;
        var pIDs = match.participantIdentities;
        for (var i=0; i<pIDs.length; i++){
            if (pIDs[i].player.accountId == accountID){
                pID = pIDs[i].participantId;
                break;
            }
        }

        var pStats = match.participants[pID-1].stats;

        var win = pStats.win;
        if (win)
            win = 1;
        else win = 0;

        var pKills = pStats.kills;
        var pDeaths = pStats.deaths;
        var pAssists = pStats.assists;

        if (queueType == 420){
            cache.solo[role].games++;
            cache.solo[role].wins += win;
            cache.solo[role].kills += pKills;
            cache.solo[role].deaths += pDeaths;
            cache.solo[role].assists += pAssists;

            cache.solo.TOTAL.games++;
            cache.solo.TOTAL.wins += win;
            cache.solo.TOTAL.kills += pKills;
            cache.solo.TOTAL.deaths += pDeaths;
            cache.solo.TOTAL.assists += pAssists;
        } else {
            cache.flex[role].games++;
            cache.flex[role].wins += win;
            cache.flex[role].kills += pKills;
            cache.flex[role].deaths += pDeaths;
            cache.flex[role].assists += pAssists;

            cache.flex.TOTAL.games++;
            cache.flex.TOTAL.wins += win;
            cache.flex.TOTAL.kills += pKills;
            cache.flex.TOTAL.deaths += pDeaths;
            cache.flex.TOTAL.assists += pAssists;
        }

        var message = "";
        if (queueType == 420){
            message += "SOLO ";
        } else {
            message += "FLEX ";
        }
        if (win){
            message += "VICTORY | "
        } else {
            message += "DEFEAT | "
        }

        console.log(message + pKills + "-" + pDeaths + "-" + pAssists + " | " + role);
        console.log("~")

        fs.writeFileSync(databaseURL, JSON.stringify(cache));

        resolve();
    });
}