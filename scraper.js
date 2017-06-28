const https = require('https');
const fs = require('fs');
const keygen = require('./api.js');

const APIKEY = keygen.getKey();

// Data stores for each role

var cache = {
        TOP: undefined,
        JUNGLE: undefined,
        MID: undefined,
        ADC: undefined,
        SUPPORT: undefined,
        TOTAL: undefined
    };

var matchlist = [];

exports.getStats = function(summoner, queues, db){

    return new Promise((resolve, reject) =>{
        // Clear cache
        cache.TOP = {games:0,wins:0,tKills:0,tDeaths:0,tAssists:0,kills:0,deaths:0,assists:0};
        cache.JUNGLE = {games:0,wins:0,tKills:0,tDeaths:0,tAssists:0,kills:0,deaths:0,assists:0};
        cache.MID = {games:0,wins:0,tKills:0,tDeaths:0,tAssists:0,kills:0,deaths:0,assists:0};
        cache.ADC = {games:0,wins:0,tKills:0,tDeaths:0,tAssists:0,kills:0,deaths:0,assists:0};
        cache.SUPPORT = {games:0,wins:0,tKills:0,tDeaths:0,tAssists:0,kills:0,deaths:0,assists:0};
        cache.TOTAL = {games:0,wins:0,tKills:0,tDeaths:0,tAssists:0,kills:0,deaths:0,assists:0};

        matchlist = [];

        queryStats(summoner, queues, db).then((result) =>{
            resolve(result);
        });
    });

}

function queryStats(summoner, queues, db){

    return new Promise((resolve, reject) =>{
        var accountID;
        console.log("--------------------")
        console.log(summoner)

        fetchID(summoner).then((result) =>{
            accountID = result;
            console.log("Account ID: " + accountID);
            return fetchMatchlist(accountID, queues);
        }).then(() =>{
            console.log("Queue Types: " + queues);
            console.log("Games Played: " + matchlist.length);
            console.log("--------------------");
            return parseMatchlist(accountID, matchlist);
        }).then((result) =>{
            var gameQueries = result;
            return fetchMatches(accountID, gameQueries)
        }).then((result) =>{
            console.log("--------------------");
            console.log("Query Completed. " + matchlist.length + " games parsed.");
            fs.writeFileSync('./data/cache.json', JSON.stringify(cache));
            resolve(cache);
        }).catch(function(e){
            console.log(e);
            reject();
        });
    });
}

function fetchID(summoner){
    return new Promise((resolve, reject) =>{
        var myRequest = 'https://na1.api.riotgames.com/lol/summoner/v3/summoners/by-name/' + summoner + '?api_key=' + APIKEY;
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

function fetchMatchlist(accountID, queues){
    return new Promise((resolveOuter, rejectOuter) =>{

        var i=0;
        var numQueries = queues.length;
        var delay = 1250;
        var queries = queues;
        var last = false;

        var reference = [];

        var fetchMatchlist = setInterval(function(){
            var myRequest = 'https://na1.api.riotgames.com/lol/match/v3/matchlists/by-account/' + accountID + '?queue=' + queues[i] + '&season=8&api_key=' + APIKEY;

            var query = new Promise((resolve,reject) =>{
                queries.push(query);
                https.get(myRequest, function(response){
                    var body = '';
                    response.on('data', (line) =>{
                        body += line;
                    }).on('end', () =>{
                        var thisQueue = JSON.parse(body);
                        if (!reference.includes(thisQueue.matches[0].gameId)){
                            var len = thisQueue.matches.length;
                            reference.push(thisQueue.matches[0].gameId);
                            for (var a=0; a<len; a++){
                                matchlist.push(thisQueue.matches[a]);
                            }
                            i++;
                            resolve();
                            if (last){
                                resolveOuter();
                            }
                        } else {
                            console.log("Error getting match list. Trying again...")
                        }
                    }).on('error', (e) =>{
                        reject();
                    });
                })
            });
            if (i == numQueries-1){
                clearInterval(fetchMatchlist);
                last = true;
            }
        }, delay);
        
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
            var query = {
                matchID: gameID,
                playerRole: role
            };
            gameQueries.push(query)
        }

        resolve(gameQueries);
    });
}

function fetchMatches(accountID, gameQueries){

    return new Promise((resolveOuter, rejectOuter) =>{
        var i = 0;
        var numQueries = gameQueries.length;
        var delay = 1250;
        var queries = [];
        var last = false;

        var fetchMatch = setInterval(function(){
            var gameID = gameQueries[i].matchID;
            var role = gameQueries[i].playerRole;

            var myRequest = 'https://na1.api.riotgames.com/lol/match/v3/matches/' + gameID + '?api_key=' + APIKEY;

            var query = new Promise((resolve,reject) =>{
                queries.push(query);
                https.get(myRequest, function(response){
                    var body = '';
                    response.on('data', (line) =>{
                        body += line;
                    }).on('end', () =>{
                        var match = JSON.parse(body);
                        if (match.gameId == gameID){
                            console.log("("+(i+1)+" of "+matchlist.length+")");
                            let parser = parseMatch(accountID, role, match).then(() =>{
                                i++;
                                resolve();
                                if (last){
                                    resolveOuter();
                                }
                            });
                        } else {
                            console.log(i + ": ERROR. Trying again in " + delay + "ms.");
                        }
                    }).on('error', (e) =>{
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

function parseMatch(accountID, role, match, resolve){

    return new Promise((resolve, reject) =>{

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
        var pKills = pStats.kills;
        var pDeaths = pStats.deaths;
        var pAssists = pStats.assists;

        cache[role].games++;
        cache[role].tKills += pKills;
        cache[role].tDeaths += pDeaths;
        cache[role].tAssists += pAssists;
        cache[role].kills = cache[role].tKills/cache[role].games;
        cache[role].deaths = cache[role].tDeaths/cache[role].games;
        cache[role].assists = cache[role].tAssists/cache[role].games;

        cache.TOTAL.games++;
        cache.TOTAL.tKills += pKills;
        cache.TOTAL.tDeaths += pDeaths;
        cache.TOTAL.tAssists += pAssists;
        cache.TOTAL.kills = cache.TOTAL.tKills/cache.TOTAL.games;
        cache.TOTAL.deaths = cache.TOTAL.tDeaths/cache.TOTAL.games;
        cache.TOTAL.assists = cache.TOTAL.tAssists/cache.TOTAL.games;

        var message = "";
        if (win){
            cache[role].wins++;
            cache.TOTAL.wins++;
            message += "WIN: "
        } else {
            message += "LOSS: "
        }

        console.log(message + pKills + "-" + pDeaths + "-" + pAssists + " | " + role);
        console.log("~")

        fs.writeFileSync('./data/cache.json', JSON.stringify(cache));

        resolve();
    });
}