var csv         = require('csv-write-stream'),
    fs          = require('fs'),
    globals     = require('./helpers/globalConstants'),
    promise     = require('./helpers/promisedFunctions');

var MIDDLE_LANE = 'middle',
    JUNGLE_ROLE = 'jungle',
    TOP_LANE = 'top',
    BOTTOM_LANE = 'bottom',
    ADC_ROLE = 'adc',
    SUPPORT_ROLE = 'support';

var ROLE_SIMPLIFIER = {};
ROLE_SIMPLIFIER[TOP_LANE]       = 0 / 4;
ROLE_SIMPLIFIER[JUNGLE_ROLE]    = 1 / 4;
ROLE_SIMPLIFIER[MIDDLE_LANE]    = 2 / 4;
ROLE_SIMPLIFIER[ADC_ROLE]       = 3 / 4;
ROLE_SIMPLIFIER[SUPPORT_ROLE]   = 4 / 4;

var SMITE_ID = 11;

Array.prototype.extend = function (other_array) {
    other_array.forEach(function(v) { this.push(v); }, this);    
};

function convertArrayToObject(runesOrMasteries) {
    var newObj = {};

    for (var i in runesOrMasteries) {
        var runeOrMastery = runesOrMasteries[i];

        var key;
        if (runeOrMastery.runeId)
            key = 'runeId';
        else
            key = 'masteryId';
        
        newObj[runeOrMastery[key]] = runeOrMastery.rank;
    }

    return newObj;
}

function flattenWithPrefixesAndRoles(arrays, preClassified) {
    var inputObj = {
        'p0role': '',
        'p1role': '',
        'p2role': '',
        'p3role': '',
        'p4role': ''
    };

    arrays.forEach(function(entry, i) {
        for (var key in entry) {
            if (key !== 'lane' && key !== 'role')
                inputObj['p' + i + key] = entry[key];
        }
    });

    return inputObj;
}

function extractMasterySummary(masteries) {
    var masteryTreeMapper = JSON.parse(fs.readFileSync('data-compiled/masteryTreeData.json'));

    var trees = {
        'Offense': 0,
        'Defense': 0,
        'Utility': 0
    };

    if (masteries) {
        masteries.forEach(function(mastery) {
            trees[masteryTreeMapper[mastery.masteryId]] += mastery.rank;
        });
    }

    return trees;
}

function parseMaxOrder(skills) {
    var maxOrder = [];

    var ranks = {};
    skills.forEach(function(skill) {
        if (!ranks[skill])
            ranks[skill] = 0;

        ++ranks[skill];

        if (ranks[skill] === 5)
            maxOrder.push(skill);
    });

    Object.keys(ranks)
        .map(function(skillKey) { return { key: skillKey, rank: ranks[skillKey] }; })
        .sort(function(a, b) { return a.rank < b.rank ? 1 : a.rank > b.rank ? -1 : 0; })
        .forEach(function(skill) {
            var skillId = parseInt(skill.key); // Undoing automatic stringification of keys by javascript
            if (skillId !== 4 && maxOrder.indexOf(skillId) === -1)
                maxOrder.push(skillId);
        });

    return maxOrder;
}

function groupPurchases(buys) {
    if (!buys)
        return [];
    
    var grouped = [];
    var i = 0;

    while (i < buys.length) {
        var subGroup = {};
        var starterTime = buys[i].time;

        while ((i < buys.length) && (buys[i].time - starterTime) < 30000) { // 30 time window of buying
            var itemId = buys[i].id;

            if (!(itemId in subGroup))
                subGroup[itemId] = 0;

            subGroup[itemId]++;
            i++;
        }

        grouped.push(subGroup);
    }

    return grouped;
}

function lanesAreProper(team) {
    var flag = false;

    var teamLanes = {};
    teamLanes[TOP_LANE] = [];
    teamLanes[JUNGLE_ROLE] = [];
    teamLanes[MIDDLE_LANE] = [];
    teamLanes[BOTTOM_LANE] = [];

    var expectedAmounts = {};
    expectedAmounts[TOP_LANE] = 1;
    expectedAmounts[JUNGLE_ROLE] = 1;
    expectedAmounts[MIDDLE_LANE] = 1;
    expectedAmounts[BOTTOM_LANE] = 2;

    var teamId = team[0].teamId;

    team.forEach(function(participant) {
        var lane = participant.timeline.lane = participant.timeline.lane.toLowerCase();

        teamLanes[lane].push(participant);

        if (teamLanes[lane].length > expectedAmounts[lane])
            flag = true;
    });

    if (flag)
        console.log('Odd:', JSON.stringify(Object.keys(teamLanes).map(function(role) { return [role, teamLanes[role].length]; })), '( team:', teamId === '100' ? 'blue' : 'red', ')');

    return !flag;
}

function parseSkillsAndBuys(matchEntry) {
    matchEntry.timeline.frames.forEach(function handleFrame(frame, i) {
        if (!frame.events) return;

        frame.events.forEach(function handleEvent(evt, j) {
            if (evt.eventType === 'SKILL_LEVEL_UP' || evt.eventType === 'ITEM_PURCHASED' || evt.eventType === 'ITEM_UNDO') {

                var participantIndex = evt.participantId - 1; // Adjust the id by 1 to get the index
                var participant = matchEntry.participants[participantIndex];

                if (evt.eventType === 'SKILL_LEVEL_UP') {
                    if (!(participant.skills))
                        participant.skills = [];

                    participant.skills.push(evt.skillSlot);
                }
                else if (evt.eventType === 'ITEM_PURCHASED') {
                    if (!(participant.buys))
                        participant.buys = [];

                    participant.buys.push({ time: evt.timestamp, id: evt.itemId });
                }
                else if (evt.eventType === 'ITEM_UNDO') {
                    for (var i = participant.buys.length - 1; i >= 0; i--) {
                        if (participant.buys[i].id === evt.itemBefore) {
                            participant.buys.splice(i, 1); // Remove the 1 item at i
                            break;
                        }
                    }
                }
            }
        });
    });

    matchEntry.participants.forEach(function(participant) {
        if (participant.skills)
            participant.skillMaxOrder = parseMaxOrder(participant.skills);
        else {
            matchEntry.hasAfker = true;
            // console.log('Match:', matchEntry.matchId, 'participant:', participant.participantId, 'has no skills');
        }
        participant.buys = groupPurchases(participant.buys);
    });
}

function parseTeams(matchEntry) {
    matchEntry.teams = {};

    matchEntry.participants.forEach(function(participant) {
        var teamId = participant.teamId;

        if (!(teamId in matchEntry.teams))
            matchEntry.teams[teamId] = [];

        matchEntry.teams[teamId].push(participant);
    });
}

function checkIsJungler(participant) {
    return (participant.spell1Id === SMITE_ID || participant.spell2Id === SMITE_ID);
}

var SUPPORT_ROLE_START_ITEMS = [
    '2010', // Total Biscuit of Rejuvenation
    '3301', // Ancient Coin
    '3302', // Relic Shield
    '3303'  // Spellthief's Edge
];
function checkIsSupport(participant) {
    var flag = false;

    if (participant.buys) {
        flag = Object.keys(participant.buys[0]).some(function(initialItemId) {
            return SUPPORT_ROLE_START_ITEMS.indexOf(initialItemId) !== -1;
        });
    }
    else
        console.log('Failed finding buys to classify', participant.participantId);

    return flag;
}

function compileData() {
    var limitStart = 0;
    var limit = Infinity;
    if (process.argv[2] && process.argv[3]) {
        limitStart = process.argv[2];
        limit = process.argv[3];
        console.log('Limiting to ' + (limit - limitStart) + ' matches');
    }
    else if (process.argv[2]) {
        limit = parseInt(process.argv[2]);
        console.log('Limiting to ' + limit + ' matches');
    }

    var runeStaticData; // Somewhat-global variable

    promise.readJson('data-compiled/runes.json')
        .then(function loadDynamic(runeStatic) {
            runeStaticData = runeStatic;
            return promise.readJson('data-compiled/matches.json');
        })
        .then(function fetchMatches(matches) {
            matches = matches.slice(limitStart, limit);

            // var matches = [1761141257];

            var goodTeams = [];
            var badTeams = [];
            var array;

            // NUM_TOTAL_CHAMP_ENTRIES = matches.length * 10;
            // NUM_IDENTIFIED_ENTRIES = 0;

            return promise.rateLimitedGet(matches, 200,
                function mapMatch(matchTuple) { // How to map a match's id to a promise request
                    return promise.persistentGet(globals.URL_PREFIX + matchTuple[1] + globals.BASE_URL + matchTuple[1] + globals.MATCH_ROUTE + matchTuple[0] + '?' + globals.KEY_TIMELINE_QUERY, matchTuple[1]);
                },
                function handleMatch(obj) { // How to handle a match's response data
                    if (!obj) {
                        console.log('Ignoring match as it returned "falsey"');
                    }
                    else if (!obj.data.timeline) {
                        console.log('Ignoring match', obj.data.matchId, 'as it has no timeline');
                    }
                    else {
                        var matchEntry = obj.data;
                        var regionStr = obj.id;

                        parseSkillsAndBuys(matchEntry);
                        parseTeams(matchEntry);

                        Object.keys(matchEntry.teams).forEach(function handleTeam(teamId) {
                            var team = matchEntry.teams[teamId];
                            var teamData = [];

                            if (lanesAreProper(team)) {
                                array = goodTeams;
                            }
                            else {
                                array = badTeams;
                            }

                            team.forEach(function handleParticipant(participant, i) {
                                var champId = participant.championId;

                                var masteries = participant.masteries ? convertArrayToObject(participant.masteries) : {};
                                var masterySummary = participant.masteries ? extractMasterySummary(participant.masteries) : {};

                                var runeTree = {};
                                if (participant.runes) {
                                    participant.runes.forEach(function(rune) {
                                        var runeType = runeStaticData[rune.runeId].type;
                                        if (!(runeType in runeTree))
                                            runeTree[runeType] = {};

                                        runeTree[runeType][rune.runeId] = rune.rank;
                                    });
                                }

                                var finalBuild = [
                                    participant.stats.item0,
                                    participant.stats.item1,
                                    participant.stats.item2,
                                    participant.stats.item3,
                                    participant.stats.item4,
                                    participant.stats.item5,
                                    participant.stats.item6
                                ].sort();

                                teamData.push({
                                    // champId:        participant.championId,
                                    // winner:         participant.stats.winner,
                                    masteryOff:     masterySummary.Offense,
                                    masteryDef:     masterySummary.Defense,
                                    masteryUti:     masterySummary.Utility,
                                    kills:          participant.stats.kills,
                                    deaths:         participant.stats.deaths,
                                    assists:        participant.stats.assists,
                                    summoner1:      participant.spell1Id,
                                    summoner2:      participant.spell2Id,
                                    // matchId:        matchEntry.matchId,
                                    // region:         regionStr,
                                    finalBuild0:    finalBuild[0],
                                    finalBuild1:    finalBuild[1],
                                    finalBuild2:    finalBuild[2],
                                    finalBuild3:    finalBuild[3],
                                    finalBuild4:    finalBuild[4],
                                    finalBuild5:    finalBuild[5],
                                    finalBuild6:    finalBuild[6],

                                    lane:           participant.timeline.lane,
                                    role:           participant.timeline.role
                                });
                            });

                            array.push(teamData);
                        });
                    }
                })
                .then(function constructObj() {
                    return { good: goodTeams, bad: badTeams };
                });
        })
        .then(function saveData(dataObj) {
            console.log('Saving');

            var options = {
                sendHeaders: false,
                separator: ' '
            }

            var trainDataWriter = csv(options);
            var testDataWriter = csv(options);

            var trainDataFile = fs.createWriteStream('../data-output/train-data.tsv');
            var testDataFile = fs.createWriteStream('../data-output/test-data.tsv');

            trainDataFile.write(
                '' + dataObj.good.length + ' ' +
                (5 * (Object.keys(dataObj.good[0][0]).length - 2) /*adjust for role/lane*/) +
                ' ' + '5\n');

            trainDataWriter.pipe(trainDataFile);
            testDataWriter.pipe(testDataFile);

            dataObj.good.forEach(function writeOut(arrays) {
                trainDataWriter.write(flattenWithPrefixesAndRoles(arrays)); // Training data is pre-classified

                var outputObj = {};
                arrays.forEach(function(entry, i) {
                    if (entry.lane !== BOTTOM_LANE) {
                        outputObj['p' + i + 'role'] = ROLE_SIMPLIFIER[entry.lane.toLowerCase()];
                    }
                    else {
                        outputObj['p' + i + 'role'] = ROLE_SIMPLIFIER[entry.role == 'DUO_CARRY' ? 'adc' : 'support'];
                    }
                });

                trainDataWriter.write(outputObj);
            });
            dataObj.bad.forEach(function writeOut(arrays) {
                testDataWriter.write(flattenWithPrefixesAndRoles(arrays));
            });

            trainDataWriter.end();
            testDataWriter.end();
        })
        .catch(function(err) {
            console.log(err.stack);
            throw err;
        });
}


compileData();