/*
 2014/01/06
 Charles Perin
 INRIA, Univ. Paris-Sud & CNRS-LIMSI
 charles.perin@free.fr
 */


var Y_SCALE_RANK = 0,
    Y_SCALE_VALUE_ABS = 1,
    Y_SCALE_VALUE_REL = 2;

var STROKE_SIZE = {
    basic: 1.5,
    over: 2.5,
    selected: 5
};

var Y_SCALE_FIELDS = ["rank","value"];

var LINEGRAPH_VISU_MODES = ["rank", "value"];


LineChart = function(params) {

    //console.log("create LineChart");
    var $this = this;
    this.table = params.table;
    this.width = params.width || 820;
    this.height = params.height || 900;
    this.data = params.data;//	 || {};
    this.parent = params.parentSVG;
    this.margins = params.margins;
    this.logo_width = 15;
    this.logo_width_focus = 25;
    this.logo_margin = 1;
    this.y_scale_mode = params.y_scale_mode;
    this.animations = params.animations;

    this.groupSVG = this.parent.append("g")
        .attr("class","linechart-group")
        .attr("transform","translate("+[params.margins.left,params.margins.top]+")")
        .on("click", function(){$this.selectDay()})
        .on("mousemove", function(){$this.mouseMoved(d3.mouse(this));});

    //add a white background to avoid clicking over the linechart
    this.groupSVG.append("rect")
        .style("fill","white")
        .attr("x",-params.margins.left)
        .attr("width",this.width)
        .attr("height",this.height-params.margins.top);


    //the different modes

    this.visuModesPanel = this.groupSVG.append("svg:g")
        .attr("class","visuModePanel")
        .attr("transform", "translate("+[$this.width-params.margins.left+4,-30]+")");

    this.visuModes = this.visuModesPanel.selectAll(".visuModes")
        .data(LINEGRAPH_VISU_MODES)
        .enter()
        .append("svg:g")
        .attr("class", "visuModes")
        .attr("transform", function(d,i){return "translate("+[0,12*i]+")";})
        .style("cursor","pointer")
        .on("click", function(d){$this.clickVisuMode(d)})
        .on("mouseover", overVisuMode);

    this.visuModes.append("svg:rect")
        .attr("x", 0)
        .attr("y", -12)
        .attr("width", 8)
        .attr("height", 8);

    this.visuModes.append("svg:text")
        .text(function(d){return d})
        .attr("class", "visuModes_text")
        .attr("text-anchor", "start")
        .style("cursor","pointer")
        .attr("x", 8)
        .attr("y", -4);


    function overVisuMode(){
        d3.select(this).style("cursor", "pointer");
    }


    this.nbDays = $this.data.length;
    this.nbTeams = $this.data[0].length;
    this.nbCols = $this.data[0][0].length;


    /*
     Initialize the line_data
     */
    $this.line_data = new Array(this.nbCols);
    for(var col=0;col<this.nbCols;col++){
        $this.line_data[col] = new Array(this.nbTeams);
        for(var team=0;team<this.nbTeams;team++){
            $this.line_data[col][team] = new Array(this.nbDays);
            for(var day=0;day<this.nbDays;day++){
                $this.line_data[col][team][day] = {
                    value: $this.data[day][team][col],
                    rank: rankings[day][col].indexOf(team),
                    teamID: team
                };
            }
        }
    }

    //compute the y_scale domain for each column and for each day according to absolute values
    this.y_scale_value_abs_domains = [];
    this.data.forEach(function(dayData,dayIndex){
        dayData.forEach(function(teamData){
            teamData.forEach(function(colValue,colIndex){
                if($this.y_scale_value_abs_domains[colIndex] == undefined){
                    $this.y_scale_value_abs_domains[colIndex] = [];
                }

                if($this.y_scale_value_abs_domains[colIndex][dayIndex] == undefined){
                    $this.y_scale_value_abs_domains[colIndex][dayIndex] = [colValue,colValue];
                }
                else{
                    if(colValue < $this.y_scale_value_abs_domains[colIndex][dayIndex][0])
                        $this.y_scale_value_abs_domains[colIndex][dayIndex][0] = colValue;
                    if(colValue > $this.y_scale_value_abs_domains[colIndex][dayIndex][1])
                        $this.y_scale_value_abs_domains[colIndex][dayIndex][1] = colValue;
                }
            })
        });
    });

    this.x_scale = d3.scale.linear().domain([0, this.nbDays-1]).range([0, this.width-params.margins.left]);

    this.hideAllElements();
};

LineChart.prototype.hideAllElements = function(duration){
    if(!duration) d3.selectAll(this.groupSVG.node().childNodes)
        .filter(function(d){
            return d3.select(this).classed("team-logo-mousemove") == false
        })
        .transition()
        .duration(duration)
        .style("opacity",0);
    else{
        d3.selectAll(this.groupSVG.node().childNodes)
            .filter(function(d){
                return d3.select(this).classed("team-logo-mousemove") == false
            })
            .transition()
            .duration(duration)
            .style("opacity",0);
    }
};

LineChart.prototype.showAllElements = function(duration){
    d3.selectAll(this.groupSVG.node().childNodes)
        .filter(function(d){
            return d3.select(this).classed("team-logo-cell") == false
            && d3.select(this).classed("team-logo-mousemove") == false
        })
        .transition()
        .duration(duration)
        .style("opacity",1);
};

LineChart.prototype.clickVisuMode = function(mode,isFirst){
    Utils.catchEvent();

    var new_y_scale_mode = LINEGRAPH_VISU_MODES.indexOf(mode);

    //if a new mode
    if(!isFirst && new_y_scale_mode == this.y_scale_mode) return;

    this.visuModes.selectAll("rect")
        .classed("modes_selected", function(d){
            return d==mode;
        });

    //update the current mode, only if we are not exploring the rank
    this.y_scale_mode = new_y_scale_mode;
    if(this.colID == RANK) this.y_scale_mode = Y_SCALE_RANK;

    this.changeYScaleMode();
    this.updateLineCharts();
    this.updateLogos(true);
    this.updateMouseMoveLogos(true);

};


LineChart.prototype.changeYScaleMode = function(){
    var $this = this;

    var y_scale_range = [this.height-this.margins.top-this.table.colHeaderH/2, this.table.colHeaderH/2],
        y_scale_axis_range = [this.table.colHeaderH/2,this.height-this.margins.top-this.table.colHeaderH/2];
    //the y_scale
    if(this.y_scale_mode == Y_SCALE_RANK){
        this.y_scale = d3.scale.linear()
            .domain([0, this.nbTeams-1])
            .range(y_scale_range);
    }
    else if(this.y_scale_mode == Y_SCALE_VALUE_ABS){
        var min = undefined, max = undefined;
        $this.line_data[$this.colID].forEach(function(teamData){
            teamData.forEach(function(dayData){
                if(min == undefined || dayData.value < min) min = dayData.value;
                if(max == undefined || dayData.value > max) max = dayData.value;
            })
        });
        this.y_scale = d3.scale.linear()
            .domain([min,max])
            .range(y_scale_range);
    }
    else if(this.y_scale_mode == Y_SCALE_VALUE_REL){
        this.y_scale = [];
        $this.y_scale_value_abs_domains[$this.colID].forEach(function(dayDomain,day){
            $this.y_scale[day] = d3.scale.linear()
                .domain(dayDomain)
                .range(y_scale_range);
        });
    }

    //the line
    if(this.y_scale_mode == Y_SCALE_RANK || this.y_scale_mode == Y_SCALE_VALUE_ABS){
        this.line = d3.svg.line()
            .x(function(d,i) { return $this.x_scale(i); })
            .y(function(d) { return $this.y_scale(d[Y_SCALE_FIELDS[$this.y_scale_mode]]); });
    }
    else if(this.y_scale_mode == Y_SCALE_VALUE_REL){
        //for relative rank, need a different scale for each day
        this.line = d3.svg.line()
            .x(function(d,i) { return $this.x_scale(i); })
            .y(function(d,i) { return $this.y_scale[i](d[Y_SCALE_FIELDS[Y_SCALE_VALUE_ABS]]); });
    }

    //the yAxis
    if(this.y_scale_mode == Y_SCALE_RANK){
        d3.select(".y-axis").style("opacity",1);
        this.y_scale_axis = d3.scale.ordinal()
            .domain(d3.range(this.y_scale.domain()[0], this.y_scale.domain()[1]+1))
            .rangePoints(y_scale_axis_range);
        this.yAxis = d3.svg.axis().scale(this.y_scale_axis)
            .orient("left")
            .tickSize(5)
            .tickFormat(function(d){return d+1});
    }
    else if(this.y_scale_mode == Y_SCALE_VALUE_REL){
        d3.select(".y-axis").style("opacity",0);
    }
    else if(this.y_scale_mode == Y_SCALE_VALUE_ABS){
        d3.select(".y-axis").style("opacity",1);
        this.y_scale_axis = d3.scale.ordinal()
            .domain(d3.range(this.y_scale.domain()[0], this.y_scale.domain()[1]))
            .rangePoints(y_scale_range);
        var tickValues = [];
        this.y_scale_axis.domain().forEach(function(d){
            if(d%5 == 0) tickValues.push(d);
        });
        this.yAxis = d3.svg.axis().scale(this.y_scale_axis)
            .orient("left")
            .tickSize(5)
            .tickValues(tickValues)
            .tickFormat(function(d){return d});
    }

};

LineChart.prototype.setYScaleMode = function(_mode){
    this.y_scale_mode = _mode;
    this.changeYScaleMode();
};

LineChart.prototype.removeFloatingElements = function(){
    this.groupSVG.selectAll(".team-lines").remove();
    this.groupSVG.selectAll(".day-line").remove();
    this.groupSVG.selectAll(".y-axis").remove();
    this.groupSVG.selectAll(".team-logo-mousemove").remove();
    this.groupSVG.selectAll(".team-logo-cell").remove();
};


LineChart.prototype.create = function(teamID, colID, day){
    //console.log("show chart");
    var $this = this;
    this.dx = 0;
    this.currentDay = day;
    this.colID = colID;
    this.teamID = teamID;


    this.setYScaleMode(this.y_scale_mode);

    this.removeFloatingElements();

    //update shadow lines
    this.updateShadowLines();

    //----------create the line paths----------//
    var gLines = $this.groupSVG.selectAll(".team-lines")
        .data($this.line_data[colID])
        .enter()
        .append("g")
        .attr("class", "team-lines")
        .on("mouseover", function(d,i){
            d3.select(this).selectAll(".pathLines").style("stroke-width", i == teamID ? STROKE_SIZE.selected : STROKE_SIZE.over);
            d3.select(this).select(".teamname-line").style("font-weight","bold");
        })
        .on("mouseout", function(d,i){
            d3.select(this).selectAll(".pathLines").style("stroke-width", i == teamID ? STROKE_SIZE.selected : STROKE_SIZE.basic);
            d3.select(this).select(".teamname-line").style("font-weight",null);
        });

    //2 lines for dashed lines with 2 colors
    gLines.append("path")
        .attr("class", "pathLines")
        .style("stroke", function(d, i) { return getTeamColorsFromTeamID(i).primary;})
        .style("stroke-width", function(d,i){return i == teamID ? STROKE_SIZE.selected : STROKE_SIZE.basic})
        .attr("d", function(d) { return $this.line(d)})
        .style("opacity",function(d,i){
            return $this.table.isTeamSelected(i) ? 1 : 0;
        });


    gLines.append("g")
        .attr("class","endGroup")
        .style("cursor","pointer")
        .attr("transform", function(d,i){
            var tx = $this.width - $this.margins.left,
                ty;
            if($this.y_scale_mode == Y_SCALE_RANK || $this.y_scale_mode == Y_SCALE_VALUE_ABS)
                ty = $this.y_scale(d[d.length-1][Y_SCALE_FIELDS[$this.y_scale_mode]]);
            else if($this.y_scale_mode == Y_SCALE_VALUE_REL){
                ty = $this.y_scale[$this.y_scale.length-1](d[d.length-1][Y_SCALE_FIELDS[Y_SCALE_VALUE_ABS]]);
            }
            else throw "unknown y_scale_mode: "+$this.y_scale_mode;
            return "translate("+[tx,ty]+")";
        })
        .on("click", clickLineEndGroup)
        .each(function(d,i){
            var attr = $this.getLogoAttributes(i,teamID);
            d3.select(this).append("image")
                .attr("xlink:href", "./img/"+attr.name+".png")
                .attr("y", -attr.width/2)
                .attr("width", attr.width)
                .attr("height", attr.width)
                .attr("filter", attr.filter);
            d3.select(this).append("text")
                .attr("class","teamname-line")
                .style("cursor","pointer")
                .attr("x", attr.width + $this.logo_margin)
                .attr("dy",4)
                .style("fill",attr.fill)
                .text(attr.name);
        });




    function clickLineEndGroup(d,i){
        d3.event.stopPropagation();
        $this.table.selectTeam(i,"linechart");
        d3.selectAll(".team-lines").each(function(d,i){
            var attr = $this.getLogoAttributes(i,teamID);
            d3.select(this).selectAll(".pathLines").style("opacity", attr.selected ? 1 : 0);
            d3.select(this).selectAll(".endGroup image").attr("filter", attr.filter);
            d3.select(this).selectAll(".endGroup .teamname-line")
                .style("fill", attr.fill)
                .attr("x",attr.width + $this.logo_margin);

        });
    }

    //---------------------The team logos when mousemove----------------//
    $this.groupSVG.selectAll(".team-logo-mousemove")
        .data(d3.range($this.nbTeams))
        .enter()
        .append("g")
        .attr("class","team-logo-mousemove")
        .attr("transform", function(d){return $this.getTransformOnLineChart(d,$this.currentDay)})
        .style("opacity", function(d){return $this.table.isTeamSelected(d) ? 1 : 0})
        .each(function(d,i){
            var attr = $this.getLogoAttributes(d,teamID);
            d3.select(this).append("image")
                .attr("xlink:href", "./img/"+attr.name+".png")
                .attr("x", -attr.width/2)
                .attr("y", -attr.width/2)
                .attr("width", attr.width)
                .attr("height", attr.width);
            d3.select(this).append("text")
                .attr("text-anchor","end")
                .attr("x",-attr.width/2-2)
                .attr("y",3)
                .text($this.getTeamValueAtDay(d,$this.currentDay,true));
        });


    //-------------------------The y axis-------------------------------------//
    this.groupSVG.append("g")
        .attr("class","y-axis")
        .call(this.yAxis);

    this.hideAllElements();
    this.clickVisuMode(LINEGRAPH_VISU_MODES[this.y_scale_mode],true);

};

LineChart.prototype.getLogoAttributes = function(teamID,focusTeamID){
    var res = {name: getShortNameForTeamID(teamID)};
    if(focusTeamID == teamID){
        res.width = this.logo_width_focus; res.filter = "null"; res.fill = "black";res.selected = true;
    }
    else{
        res.width = this.logo_width;
        res.selected = false;
        if(this.table.isTeamSelected(teamID)){
            res.fill = "black"; res.filter = "null"; res.selected = true;
        }
        else{
            res.fill = "gray"; res.filter = "url(#grayscale)"; res.selected = false;
        }
    }
    return res;
};

LineChart.prototype.getTransformOnLineChart = function(teamID,day){
    if(!day) day = this.table.data_index;
    var ty = this.y_scale(this.getTeamValueAtDay(teamID,day));
    return "translate("+
        [
            this.margins.left + this.x_scale(day),
            ty
        ]+")";
};

LineChart.prototype.getXOnLineChart = function(teamID,day){
    if(!day) day = this.table.data_index;
    return this.margins.left + this.x_scale(day);
};

LineChart.prototype.getTeamValueAtDay = function(teamID,day,inverseRank){
    if(!day) day = this.table.data_index;
    if(this.y_scale_mode == Y_SCALE_VALUE_ABS){
        return this.line_data[this.colID][teamID][day][Y_SCALE_FIELDS[this.y_scale_mode]];
    }
    else if(this.y_scale_mode == Y_SCALE_RANK){
        if(inverseRank) return this.nbTeams - this.line_data[this.colID][teamID][day][Y_SCALE_FIELDS[this.y_scale_mode]];
        else return this.line_data[this.colID][teamID][day][Y_SCALE_FIELDS[this.y_scale_mode]];
    }
    else if(this.y_scale_mode == Y_SCALE_VALUE_REL){
        return this.line_data[this.colID][teamID][day][Y_SCALE_FIELDS[Y_SCALE_VALUE_ABS]];
    }
    else throw "unknown y_scale_mode: "+this.y_scale_mode;
};

LineChart.prototype.updateLogos = function(isAnimated){
    var $this = this;
    if(isAnimated){
        this.groupSVG.selectAll(".team-logo-cell")
            .transition()
            .duration(this.animations.switch_vis.switch)
            .attr("transform", function(d){
                return $this.getTransformOnLineChart(d.teamID,$this.table.data_index);
            });
    }
    else this.groupSVG.selectAll(".team-logo-cell")
        .attr("transform", function(d){
            return $this.getTransformOnLineChart(d.teamID,$this.table.data_index);
        });

};

LineChart.prototype.updateMouseMoveLogos = function(isAnimated){
    var $this = this;
    if(isAnimated){
        $this.groupSVG.selectAll(".team-logo-mousemove")
            .transition()
            .duration(this.animations.switch_vis.switch)
            .attr("transform", function(d){return $this.getTransformOnLineChart(d,$this.currentDay)})
            .style("opacity", function(d,i){return $this.table.isTeamSelected(d) ? 1 : 0; })
            .select("text")
            .text(function(d){return $this.getTeamValueAtDay(d,$this.currentDay,true)});
    }
    else $this.groupSVG.selectAll(".team-logo-mousemove")
        .attr("transform", function(d){return $this.getTransformOnLineChart(d,$this.currentDay)})
        .style("opacity", function(d,i){ return $this.table.isTeamSelected(d) ? 1 : 0; })
        .select("text")
        .text(function(d){return $this.getTeamValueAtDay(d,$this.currentDay,true)});

};


LineChart.prototype.showLineChart = function(duration){
    this.showAllElements(duration);
    //bring linechart to front
    this.groupSVG.moveToFront();
};


LineChart.prototype.updateLineCharts = function(){
    var $this = this;

    //update shadow lines
    this.updateShadowLines();

    //----------create the line paths----------//
    var gLines = $this.groupSVG.selectAll(".team-lines");

    gLines.selectAll(".pathLines")
        .transition()
        .duration(this.animations.switch_vis.switch)
        .attr("d", function(d) { return $this.line(d)});

    var endGroup = gLines.select(".endGroup")
        .transition()
        .duration(this.animations.switch_vis.switch)
        .attr("transform", function(d,i){
            var tx = $this.width - $this.margins.left,
                ty;
            if($this.y_scale_mode == Y_SCALE_RANK || $this.y_scale_mode == Y_SCALE_VALUE_ABS)
                ty = $this.y_scale(d[d.length-1][Y_SCALE_FIELDS[$this.y_scale_mode]]);
            else if($this.y_scale_mode == Y_SCALE_VALUE_REL){
                ty = $this.y_scale[$this.y_scale.length-1](d[d.length-1][Y_SCALE_FIELDS[Y_SCALE_VALUE_ABS]]);
            }
            else throw "unknown y_scale_mode: "+$this.y_scale_mode;
            return "translate("+[tx,ty]+")";
        });

    d3.select(".y-axis")
        .call(this.yAxis);
};



LineChart.prototype.selectDay = function(){
    if(this.currentDay != undefined && this.currentDay != table.data_index){
        widgets.setValue(this.currentDay);
    }
    table.slider.setGhosts([]);
    this.hide();
};



LineChart.prototype.mouseMoved = function(mouse){
    var $this = this;

    var newDay = Math.round(Math.max($this.x_scale.domain()[0],Math.min($this.x_scale.domain()[1],$this.x_scale.invert(mouse[0]))));
    if(newDay == this.currentDay) return;

    this.currentDay = newDay;

    this.updateShadowLines();
    this.updateMouseMoveLogos();
};

LineChart.prototype.updateShadowLines = function(){
    var $this = this;
    this.groupSVG.selectAll(".day-line").remove();
    this.groupSVG.selectAll(".day-area").remove();

    var target;
    var tables = [this.table.data_index];
    if(this.y_scale_mode == Y_SCALE_RANK){
        target = rankings[this.currentDay][this.colID].indexOf(this.teamID);
        rankings.forEach(function(d_day,day){
            if(d_day[$this.colID][target] == $this.teamID){
                tables.push(day);
            }
        });
    }
    else if(this.y_scale_mode == Y_SCALE_VALUE_ABS || this.y_scale_mode == Y_SCALE_VALUE_REL){
        target = $this.data[this.currentDay][this.teamID][this.colID];
        $this.data.forEach(function(d_day,day){
            if(d_day[$this.teamID][$this.colID] == target){
                tables.push(day);
            }
        });
    }
    else throw("invalid y_scale_mode: "+$this.y_scale_mode);

    var shadow_data = tables.map(function(the_day){
        return {value: the_day, level: $this.table.data_index == the_day ? 1 : ( the_day == $this.currentDay ? .8 : .3)};
    });
    shadow_data.sort(function(a,b){
        if(a.value> b.value) return 1;
        if(a.value< b.value) return -1;
        return 0;
    });

    //init the shadow lines
    var shadow_lines = shadow_data.filter(function(d){return d.level != .3});
		shadow_data = shadow_data.map(function(d){if(d.value == $this.table.data_index) return {value:d.value,level:0};return d;});

    var shadow_areas = [];
    for(var i=0;i<shadow_data.length;i++){
        var nextVal = shadow_data[i+1],
            serie = {start: shadow_data[i].value, end: shadow_data[i].value};
        while(nextVal != undefined && nextVal.value == (serie.end+1)){
            serie.end = nextVal.value;
            i++;
            if(shadow_data[i+1] != undefined) nextVal = shadow_data[i+1];
        }
        //add to shadow lines if alone
        if(nextVal == undefined || serie.end == serie.start) {
            shadow_lines.push(shadow_data[i]);
        }
        else {
            //add to shadow areas if a series
            shadow_areas.push(serie);
        }
    }

    this.groupSVG.selectAll(".day-line")
        .data(shadow_lines)
        .enter()
        .append("line")
        .attr("class","day-line")
        .attr("x1", function(d){return $this.x_scale(d.value)})
        .attr("x2", function(d){return $this.x_scale(d.value)})
        .attr("y1", $this.height-$this.margins.top)
        .attr("y2", 0)
        .style("stroke","black")
        .style("stroke-opacity", function(d){return d.level});


    this.groupSVG.selectAll(".day-area")
        .data(shadow_areas)
        .enter()
        .insert("rect",".team-lines")
        .attr("class","day-area")
        .attr("x", function(d){return $this.x_scale(d.start)})
        .attr("y", 0)
        .attr("width", function(d){return Math.abs($this.x_scale(d.end) - $this.x_scale(d.start))})
        .attr("height", $this.height-$this.margins.top);


    //update the slider ghosts
    this.table.slider.setGhosts(shadow_data);
};

LineChart.prototype.hide = function(){
    this.currentDay = undefined;

    //put linechart in background
    d3.select(".cells-group").moveToFront();

    this.table.leaveLineChartMode(this.teamID, this.colID);

};

