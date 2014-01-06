/*
 2014/01/06
 Charles Perin
 INRIA, Univ. Paris-Sud & CNRS-LIMSI
 charles.perin@free.fr
 */

/*
 Compute ranking data for ALL days and ALL teams

 Returns something like below

 data = [day0,day1,...]
 data[day_i] = [team0,team1,...]
 data[day_i][team_j] = [col0,col1,...]
 data[day_i][team_j][col_k] = value for the column k for team j at day i.

 rankings = [day0,day1,...]
 rankings[day_i] = [col0,col1,...]
 rankings[day_i][col_j] = [team0,team1,...]
 rankings[day_i][col_j][team_k] = rank for team k at day i and for column j

 */



var rankings = [];

var RANK=0, TEAM_ID=1, POINTS_DAY=2, WON=3, DRAW=4, LOST=5, POINTS_HOME=6, POINTS_AWAY=7, GOAL_SCORED=8, GOAL_CONCED=9, GOAL_DIFF=10;


function compute_data(outcomes) {

    //console.log(outcomes);
    // Get the total number of days
    var nb_days = d3.max(outcomes, function(d){
        return d.day;
    });

    // This will contain the final array of array
    var result = Array(nb_days);
    rankings = Array(nb_days);

    // Compute results per each day
    for(var day=0; day<=nb_days; day++) {

        // Add another dimension to the 2D array that contains day y
        result[day] = [];
        rankings[day] = [];

        // Init ALL teams for the specific day y
        unique_teams.map(function(d, i) {
            var t = [];
            if(day==0) { // The first day we reset all values
                t[RANK] = 0;                        // teamID
                t[TEAM_ID] = i;                        // teamID
                t[WON] = 0;
                t[DRAW] = 0;
                t[LOST] = 0;
                t[POINTS_HOME] = 0;                    // pointsHome
                t[POINTS_AWAY] = 0;                    // pointsAway
                t[GOAL_SCORED] = 0;                    // goalsScored
                t[GOAL_CONCED] = 0;                    // goalsConceded
            } else {    // The other days, just sums
                t[RANK] = 0;
                t[TEAM_ID] = i;
                t[WON] = result[day-1][i][WON];
                t[DRAW] = result[day-1][i][DRAW];
                t[LOST] = result[day-1][i][LOST];
                t[POINTS_HOME] = result[day-1][i][POINTS_HOME];
                t[POINTS_AWAY] = result[day-1][i][POINTS_AWAY];
                t[GOAL_SCORED] = result[day-1][i][GOAL_SCORED];
                t[GOAL_CONCED] = result[day-1][i][GOAL_CONCED];
            }

            t[POINTS_DAY] = t[POINTS_HOME]+t[POINTS_AWAY];                      // Points
            t[GOAL_DIFF] = t[GOAL_SCORED]-t[GOAL_CONCED];                      // Diff
            result[day].push(t);
        });

        // Browse all outcomes and filter by day
        for(var c=0; c<outcomes.length; c++) {

            // Filter by day
            if(outcomes[c].day==day) {

                var teamHome = outcomes[c].teamHome, teamHomeIndex = unique_teams.indexOf(teamHome);
                var teamAway = outcomes[c].teamAway, teamAwayIndex = unique_teams.indexOf(teamAway);

                // Check if victory, draw or loss
                if(parseInt(outcomes[c].goalsHome)>parseInt(outcomes[c].goalsAway)) {

                    result[day][teamHomeIndex][POINTS_HOME] += 3;
                    result[day][teamAwayIndex][POINTS_AWAY] += 0;
                    result[day][teamHomeIndex][WON] += 1;
                    result[day][teamAwayIndex][LOST] += 1;


                } else if(parseInt(outcomes[c].goalsAway)>parseInt(outcomes[c].goalsHome)) {

                    result[day][teamHomeIndex][POINTS_HOME] += 0;
                    result[day][teamAwayIndex][POINTS_AWAY] += 3;
                    result[day][teamHomeIndex][LOST] += 1;
                    result[day][teamAwayIndex][WON] += 1;

                } else {

                    result[day][teamHomeIndex][POINTS_HOME]++;
                    result[day][teamAwayIndex][POINTS_AWAY]++;
                    result[day][teamHomeIndex][DRAW] += 1;
                    result[day][teamAwayIndex][DRAW] += 1;
                }


                // Other points (immediate)
                result[day][teamHomeIndex][GOAL_SCORED] += parseInt(outcomes[c].goalsHome);
                result[day][teamHomeIndex][GOAL_CONCED] += parseInt(outcomes[c].goalsAway);

                result[day][teamAwayIndex][GOAL_SCORED] += parseInt(outcomes[c].goalsAway);
                result[day][teamAwayIndex][GOAL_CONCED] += parseInt(outcomes[c].goalsHome);

                // Compute other (from calculations)
                result[day][teamHomeIndex][POINTS_DAY] = result[day][teamHomeIndex][POINTS_HOME] + result[day][teamHomeIndex][POINTS_AWAY];
                result[day][teamAwayIndex][POINTS_DAY] = result[day][teamAwayIndex][POINTS_HOME] + result[day][teamAwayIndex][POINTS_AWAY];

                result[day][teamHomeIndex][GOAL_DIFF] = result[day][teamHomeIndex][GOAL_SCORED] - result[day][teamHomeIndex][GOAL_CONCED];
                result[day][teamAwayIndex][GOAL_DIFF] = result[day][teamAwayIndex][GOAL_SCORED] - result[day][teamAwayIndex][GOAL_CONCED];

                // Add points to both teams
                //result[unique_teams.indexOf(outcomes[c].teamHome)]

            }
        }



        // Compute rankings for current day

        //for each day, create the columns array
        rankings[day] = new Array(columnNames.length);
        columnNames.forEach(function(col,c){
            //for each column array, create the team ids arrays
            rankings[day][c] = new Array(unique_teams.length);
        });


        //-------------------First, compute rank according to TEAM_ID------------------------//
        [TEAM_ID].forEach(function(col_id){
            //create a temporary array to store the team values and to be sorted
            var day_row_col = result[day].map(function(d, i) {
                return {tid:i, value:d[col_id]};
            });
            //sort the temporary array
            day_row_col = day_row_col.sort(function(a, b) {
                return (unique_teams[a.tid] < unique_teams[b.tid]) ? 1 : -1;
            });
            // Fill the ranking array, with team ids only
            day_row_col.forEach(function(d, i) {
                rankings[day][col_id][i] = d.tid;
            });
        });


        //-------------------Then, compute ranks for WON, DRAW, LOST, GOAL_SCORED & GOAL_CONCED------------------------//
        [WON,DRAW,LOST,GOAL_SCORED,GOAL_CONCED,GOAL_DIFF].forEach(function(col_id){
            //create a temporary array to store the team values and to be sorted
            var day_row_col = result[day].map(function(d, i) {
                return {tid:i, value:d[col_id]};
            });
            //sort the temporary array
            day_row_col = day_row_col.sort(function(a, b) {
                //sort by goals scored/conceded/diff
                if(a.value < b.value) return -1;
                else if(a.value > b.value) return 1;
                else {//sort alphabetically
                    return (unique_teams[a.tid] < unique_teams[b.tid]) ? 1 : -1;
                }
            });
            // Fill the ranking array, with team ids only
            day_row_col.forEach(function(d, i) {
                rankings[day][col_id][i] = d.tid;
            });
        });
        //reverse the conceded goals ranks
        rankings[day][GOAL_CONCED].reverse();

        //-----------------------Finally, compute ranks for POINTS columns---------------------------//
        [POINTS_DAY,POINTS_HOME,POINTS_AWAY].forEach(function(col_id){
            //create a temporary array to store the team values and to be sorted
            var day_row_col = result[day].map(function(d, i) {
                return {tid:i, value:d[col_id], diff:d[GOAL_DIFF], scored: d[GOAL_SCORED]};
            });
            //sort the temporary array
            day_row_col = day_row_col.sort(function(a, b) {
                //sort by number of points
                if(a.value < b.value) return -1;
                else if(a.value > b.value) return 1;
                else {//sort by goals diff
                    if(a.diff < b.diff) return -1;
                    else if(a.diff > b.diff) return 1;
                    else{//sort by scored goals
                        if(a.scored < b.scored) return -1;
                        else if(a.scored > b.scored) return 1;
                        else {//sort alphabetically
                            return (unique_teams[a.tid] < unique_teams[b.tid]) ? 1 : -1;
                        }
                    }
                }
            });
            // Fill the ranking array, with team ids only
            day_row_col.forEach(function(d, i) {
                rankings[day][col_id][i] = d.tid;
            });
        });

        //the rank column is the same as the points_day rank column
        rankings[day][RANK] = rankings[day][POINTS_DAY];
    }


    return result;
}



//just a debug function to print the ranking of teams in javascript console
function printRank(day,column){
    var c = columnNames.indexOf(column);
    rankings[day][c].forEach(function(tid,i){
        console.log("   "+(i+1)+":   "+unique_teams[tid]);
    });
}


function getTeamColorsFromTeamID(teamID){
    var teamName = unique_teams[teamID];
    switch(teamName){
        case "Montpellier":
            return {primary: "#FF6100", secondary: "#0047A6"};
        case "Evian Thonon Gaillard":
        case "Evian":
        case "Evian TG":
            return {primary: "#9F8C50", secondary: "#ED1443"};
        case "Nancy":
            return {primary: "#DD160B", secondary: "#FFFFFF"};
        case "Nice":
            return {primary: "#D92322", secondary: "#231F20"};
        case "Paris SG":
            return {primary: "#00448E", secondary: "#F4232E"};
        case "Rennes":
            return {primary: "#F40D1D", secondary: "#FFFFFF"};
        case "Sochaux":
            return {primary: "#FBC314", secondary: "#FBC314"};
        case "St Etienne":
            return {primary: "#019D50", secondary: "#019D50"};
        case "Troyes":
            return {primary: "#0065B8", secondary: "#FFFFFF"};
        case "Reims":
            return {primary: "#D2232A", secondary: "#FFFFFF"};
        case "Lille":
            return {primary: "#CA031E", secondary: "#FFFFFF"};
        case "Bastia":
            return {primary: "#004689", secondary: "#FFFFFF"};
        case "Brest":
            return {primary: "#DA031D", secondary: "#FFFFFF"};
        case "Lorient":
            return {primary: "#FF7502", secondary: "#000000"};
        case "Lyon":
            return {primary: "#0D2599", secondary: "#F3000B"};
        case "Toulouse":
            return {primary: "#5B3DC3", secondary: "#5B3DC3"};
        case "Valenciennes":
            return {primary: "#CE2726", secondary: "#FFFFFF"};
        case "Ajaccio":
        case "AC Ajaccio":
            return {primary: "#F30100", secondary: "#FFFFFF"};
        case "Bordeaux":
            return {primary: "#001B50", secondary: "#001B50"};
        case "Marseille":
            return {primary: "#00ABF4", secondary: "#00ABF4"};
      case "Le Mans":
        return {primary: "#FF132E", secondary: "#FF132E"};
      case "Grenoble":
        return {primary: "#7AAFD7", secondary: "#E8F1F8"};
        default:
      case "Monaco":
        return {primary: "#EF3131", secondary: "#EFCF64"};
            throw "unknown team name: "+teamName;
    }
}

function getShortNameForTeamID(teamID){
    var teamName = unique_teams[teamID];
    switch(teamName){
        case "Montpellier":
            return "MHSC";
        case "Evian Thonon Gaillard":
        case "Evian":
				case "Evian TG":
            return "ETG";
        case "Nancy":
            return "ASNL";
        case "Nice":
            return "OGCN";
        case "Paris SG":
            return "PSG";
        case "Rennes":
            return "SRFC";
        case "Sochaux":
            return "FCSM";
        case "St Etienne":
            return "ASSE";
        case "Troyes":
            return "ESTAC";
        case "Reims":
            return "SR";
        case "Lille":
            return "LOSC";
        case "Bastia":
            return "SCB";
        case "Brest":
            return "St.B";
        case "Lorient":
            return "FCL";
        case "Lyon":
            return "OL";
        case "Toulouse":
            return "TFC";
        case "Valenciennes":
            return "VAFC";
        case "Ajaccio":
				case "AC Ajaccio":
            return "ACA";
        case "Bordeaux":
            return "GdB";
        case "Marseille":
            return "OM";
      case "Le Mans":
        return "LMFC";
      case "Grenoble":
        return "GF_38";
      case "Monaco":
        return "ASM";
        default:
            throw "unknown team name: "+teamName;
    }
}


