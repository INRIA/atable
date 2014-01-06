/*
 2014/01/06
 Charles Perin
 INRIA, Univ. Paris-Sud & CNRS-LIMSI
 charles.perin@free.fr
 */


function Tangle(table){
    this.table = table;
    this.data = table.data;

    //higher decrease is -20, higher increase is +20
    this.team_evolution_angle_scale = d3.scale.linear().domain([-19,19]).range([90,-90]).clamp(true);
    this.team_evolution_color_scale = d3.scale.linear().domain([-19,-15,-11,-7,-3,0,3,7,11,15,19]).range([
        "#A50026",
        "#D73027",
        "#F46D43",
        "#FDAE61",
        "#FEE08B",
        "#FFFFFF",
        "#D9EF8B",
        "#A6D96A",
        "#66BD63",
        "#1A9850",
        "#006837"
    ]).clamp(true);

    this.cell_col_id = undefined;
    this.cell_team_id = undefined;
    this.cell_value = undefined;
    this.cell_min = undefined;
    this.cell_max = undefined;
    this.closest_table = undefined;
    this.corresponding_tables = undefined;
}


Tangle.prototype.setColOrder = function(col_order){
    this.col_order = col_order;
};


Tangle.prototype.startDrag = function(c,the_cell) {
    var $this = this;

    if(c.index == TEAM_ID) return;

    if(c.index == RANK) {
        c.drag_value = c.currentValidValue = $this.data[$this.table.data_index].length-c.value;
    }
    else {
        c.drag_value = c.currentValidValue = c.value;
    }

    //console.log("dragmove start", c, d3.event, d3.event.translate);
    d3.select(the_cell).classed("dragged",true);

    d3.select(the_cell).each(function(d,i){
        $this.cell_col_id = d.index;
        $this.cell_value = d.value;
        d3.select(d3.select(this).node().parentNode).each(function(d2,i2) {
            $this.cell_team_id = d2.data[TEAM_ID];

            switch($this.cell_col_id){
                case RANK:
                    $this.cell_min = d3.min(rankings, function(d_day){
                        return d_day[$this.col_order].indexOf($this.cell_team_id);
                    });
                    $this.cell_max = d3.max(rankings, function(d_day){
                        return d_day[$this.col_order].indexOf($this.cell_team_id);
                    });
                    break;

                case GOAL_DIFF://if can go negative
                    $this.cell_min = d3.min($this.data, function(d){ return d[$this.cell_team_id][$this.cell_col_id]});
                    $this.cell_max = d3.max($this.data, function(d){ return d[$this.cell_team_id][$this.cell_col_id]});
                    break;

                case TEAM_ID://if no tangle available
                    console.log("No tangle for Team id !");
                    break;

                default://if checking a positive value, can't go negative
                    $this.cell_min = 0;
                    $this.cell_max = d3.max($this.data, function(d){ return d[$this.cell_team_id][$this.cell_col_id]});
                    break;

            }
        });
    });
};


Tangle.prototype.moveDrag = function(c,the_cell) {
    //console.log("dragmove move");
    var $this = this;

    if(c.index == TEAM_ID) return;

    if($this.cell_team_id != undefined && $this.cell_col_id != undefined && $this.cell_value != undefined && $this.cell_min != undefined && $this.cell_max != undefined){
        var target = c.drag_value - d3.event.dy;
        $this.closest_table = undefined;
        $this.corresponding_tables = [];


        //----------check if the target exists-------------//
        if(target <= $this.cell_min){
            target = $this.cell_min;
        }
        else if(target >= $this.cell_max){
            target = $this.cell_max;
        }

        //find the closest table with the associated value, if exist, and the other tables with corresponding value
        if($this.cell_col_id == RANK){
            rankings.forEach(function(d_day,day){
                if(d_day[$this.col_order].indexOf($this.cell_team_id) == target){
                    $this.corresponding_tables.push(day);
                }
            });
        }
        else{
            $this.data.forEach(function(d_day,day){
                if(d_day[$this.cell_team_id][$this.cell_col_id] == target){
                    $this.corresponding_tables.push(day);
                }
            });
        }
        for(var i=0;i<$this.corresponding_tables.length;i++){
            if($this.closest_table == undefined || $this.corresponding_tables[i] - $this.table.data_index < $this.closest_table - $this.table.data_index){
                $this.closest_table = $this.corresponding_tables[i];
            }
        }

        c.drag_value = target;

        /*
         If show arrows
         */
        if($this.closest_table != undefined){
            c.currentValidValue = target;
            c.currentClosestTable = $this.closest_table;
            if($this.cell_col_id == RANK){
                d3.select(the_cell).select("text").text($this.data[$this.table.data_index].length-c.currentValidValue);
            }
            else {
                d3.select(the_cell).select("text").text(c.currentValidValue);
            }
            $this.table.tableGroup.selectAll(".row-group").each(function(row){
                d3.select(this).selectAll(".cell")
                    .filter(function(d){return d.index == TEAM_ID})
                    .each(function(d){
                        var shadowRank = rankings[$this.closest_table][$this.col_order].indexOf(row.index);
                        var currentRank = rankings[$this.table.data_index][$this.col_order].indexOf(row.index);
                        var teamEvolution = $this.getTeamEvolution(currentRank,shadowRank);
                        d3.select(this).select(".shadow-arrow")
                            .transition()
                            .duration(50)
                            .attr("transform", "rotate("+teamEvolution.angle+")")
                            .style("fill",teamEvolution.color)
                            .style("opacity",1);
                    })
            });
        }

        var ghosts_data = $this.corresponding_tables.map(function(day){
            return {value: day, level: day == $this.closest_table ? .6 : .3};
        });
        $this.table.slider.setGhosts(ghosts_data);
    }
};

Tangle.prototype.endDrag = function(c,the_cell) {
    var $this = this;
    if(c.index == TEAM_ID) return;

    //console.log("dragmove end");

    d3.select(the_cell).classed("dragged",false);
    d3.select(the_cell).classed("invalid",false);
    d3.select(the_cell).select("text").text(function(){
        if(c.index == TEAM_ID) return $this.unique_teams[c.value];
        else if(c.index == RANK)return c.value+1;
        else return c.value;
    });
    if(c.index == RANK){
        c.drag_value = c.value-1;
    }
    c.drag_value = c.value;

    //if change table
    if(c.currentClosestTable != undefined){
        widgets.setValue(c.currentClosestTable);
        $this.table.changeDay(c.currentClosestTable);
    }

    c.currentClosestTable = undefined;
    c.currentValidValue = undefined;
    $this.closest_table = undefined;
    $this.cell_team_id = undefined;
    $this.cell_col_id = undefined;
    $this.cell_value = undefined;
    $this.cell_min = undefined;
    $this.cell_max = undefined;
    $this.corresponding_tables = [];

    $this.table.tableGroup.selectAll(".row-group .cell text")
        .style("fill",null);
    $this.table.tableGroup.selectAll(".cell .shadow-arrow")
        .transition()
        .delay(1000)
        .duration(500)
        .style("opacity",0);


    $this.table.slider.setGhosts([]);
};



Tangle.prototype.getTeamEvolution = function(rank1,rank2){
    return {
        angle: this.team_evolution_angle_scale(rank2-rank1),
        color: this.team_evolution_color_scale(rank2-rank1)
    };
};