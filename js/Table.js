/*
 2014/01/06
 Charles Perin
 INRIA, Univ. Paris-Sud & CNRS-LIMSI
 charles.perin@free.fr
 */


var columnNames = [" ",' ', 'Pts', "V", "N", "D",'Dom', 'Ext', 'Bp', 'Bc', 'Diff'];
var columnTitles = [" ", " ", 'Points', "Victoires", "Nuls", "Défaites",'Points à domicile', 'Points à l\'extérieur', 'Buts pour', 'Buts contre', 'Différence de buts'];
var PODIUM_RANK = 3,
    EUROPE_RANK = 5,
    RELEGATION_RANK = 18;

function Table(params){
    this.language = DEFAULT_LANGUAGE;
    this.init(params);
    this.setInteractionMode(params.mode,true);
    this.changeOrder(true);
}

Table.prototype.setLanguage = function(language){
    this.language = language;
    var $this = this;

    if(this.language == FRENCH){
        this.column_labels.names = [" ", " ", 'Pts', "V", "N", "D",'Dom', 'Ext', 'Bp', 'Bc', 'Diff'];
        this.column_labels.titles = [" ", " ", 'Points', "Victoires", "Nuls", "Défaites",'Points à domicile', 'Points à l\'extérieur', 'Buts pour', 'Buts contre', 'Différence de buts'];
    }
    else if(this.language == ENGLISH){
        this.column_labels.names = [" "," ", 'Pts', "W", "D", "L",'Ho', 'Aw', 'GF', 'GA', 'GD'];
        this.column_labels.titles = [" "," ", 'points', "Win", "Draw", "Loss",'Home points', 'Away points', 'Goals for', 'Goals against', 'Goal difference'];
    }
    //update the col headers
    var colHeaders = this.tableGroup.select('.col-header-group').selectAll(".col-header");
    //retrieve the sort
    colHeaders.data(this.column_labels.names.map(function(d,i){
        if(i==$this.order_identifier[0]) return {name:d,sorted:$this.order_identifier[1]};
        return {name:d};
    }))
        .attr("transform", function(d,i){
            d.transform_init = "translate("+[$this.x_scale(i),0]+")";
            return d.transform_init;
        });

    colHeaders.select(".bkg")
        .attr("width",function(d,i){
            d.bkg_width = $this.x_scale(i+1)-$this.x_scale(i);
            return d.bkg_width;
        });
    colHeaders.select("text")
        .attr("x",function(d){return d.bkg_width/2})
        .text(function(d){ return d.name; });
    colHeaders.select("title")
        .text(function(d,i){return $this.column_labels.titles[i]})
};

Table.prototype.init = function(params){
    var $this = this;
    this.hasSlider = params.slider.hasSlider;
    this.x = params.x;
    this.y = params.y;
    this.animations = params.animations;
    this.width = params.width;
    this.height = params.height;
    this.margins = params.margins;
    this.data_index = params.data.current_day;
    this.column_labels = params.data.columnLabel;
    this.data = params.data.data;
    this.order_identifier = null;
    this.nbDays = params.data.nbDays;
    this.selected_teams = [];

    if(DEBUG_CONSOLE)console.log(this.data);

    var tableY = this.hasSlider ? params.slider.height : 0;

    //---------------------------------------------------------------//
    //----------------------Some constants---------------------------//
    //---------------------------------------------------------------//
    var img_sort_size = 12;
    var n = this.data[this.data_index].length;
    var chartW = this.chartW = Math.max(this.width - this.margins.left - this.margins.right, 0.1);
    var chartH = this.chartH = Math.max(this.height - tableY - this.margins.top - this.margins.bottom, 0.1);
    var colHeaderH = this.colHeaderH = 20;

    //---------------------------------------------------------------//
    //---------the nodes are used to reorder the table---------------//
    //------consist of the raw data + an index, in an object---------//
    //---------------------------------------------------------------//
    this.nodes = [];
    this.data[this.data_index].forEach(function(d,i){
        $this.nodes.push({data:d, index:i});
    });

    //---------------------------------------------------------------//
    //---------Init the orders and apply the default order-----------//
    //---------------------------------------------------------------//
    this.computeOrders();
    this.order_identifier = [POINTS_DAY,1];
    this.order = this.orders[$this.order_identifier[0]][$this.order_identifier[1]];


    //---------------------------------------------------------------//
    //--------------------------The scales---------------------------//
    //---------------------------------------------------------------//
    this.y_scale = d3.scale.ordinal().rangeBands([colHeaderH, chartH]);

    var x_range = [], x_domain = [];
    this.column_labels.domain.forEach(function(d,i){
        x_range[i] = chartW*d;
        x_domain.push(i);
    });

    this.x_scale = d3.scale.linear()
        .domain(x_domain)
        .range(x_range);

    this.y_scale.domain(this.order);//default order: points descending

    this.rank_color_scale = d3.scale.linear().domain([0,n-1]).range(["white","black"]);
    this.rank_text_color_scale = d3.scale.linear().domain([0,(n-1)/3,2*(n-1)/3,n-1]).range(["#000000","#000000","#FFFFFF","#FFFFFF"]);


    //---------------------------------------------------------------//
    //-----------------------------SVG-------------------------------//
    //---------------------------------------------------------------//
    var svg = d3.select("#rankingTable").append("svg:svg")
        .attr("width",this.width+30)
        .attr("height",this.height);
    svg.append("defs")
        .append("filter")
        .attr("id","grayscale")
        .append("feColorMatrix")
        .attr("type","matrix")
        .attr("values","0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0 0 0 1 0")


    var globalGroup = svg.append('g')
        .attr('class', 'table-group')
        .attr('transform', 'translate(' + [this.margins.left , this.margins.top + tableY] + ')');
    this.tableGroup = globalGroup.append("g")
        .attr("class","cells-group");
    this.tableGroup.append("rect")
        .attr("class","table-bkg")
        .style("fill","white")
        .attr("width",this.width)
        .attr("height",482);


    this.lineChart = new LineChart({
        table:$this,
        y_scale_mode: params.line_chart.y_scale_mode,
        width: chartW,
        height: chartH,
        data: this.data,
        margins: {top: colHeaderH, left: 0},
        parentSVG: d3.select(this.tableGroup.node().parentNode),
        animations:{
            switch_vis: this.animations.dm_switch_vis
        }
    });
    this.tangle = new Tangle(this);

    //---------------------------------------------------------------//
    //-----------------------Col headers-----------------------------//
    //---------------------------------------------------------------//
    var ColHeadersGroup = this.tableGroup.append('g').attr('class', 'col-header-group');

    var arrow_width = 10, arrow_height = 8;

    ColHeadersGroup.selectAll(".col-header")
        .data(this.column_labels.names.map(function(d,i){return {name:d}}))
        .enter()
        .append("g")
        .attr("class", "col-header")
        .attr("transform", function(d,i){
            d.transform_init = "translate("+[$this.x_scale(i),0]+")";
            return d.transform_init;
        })
        .on("mouseover", function(d,i){
            if(i==RANK) return;
            d3.select(this).style("cursor", "pointer");
        })
        .on("click", function(d,i){
            if(i==RANK) return;
            ColHeadersGroup.selectAll(".col-header").filter(function(d2,i2){return i2 != i}).each(function(d){d.sorted = undefined});
            if(!d.sorted) d.sorted = 1;
            else d.sorted = 0;
            $this.order_identifier = [i, d.sorted];

            $this.order = $this.orders[$this.order_identifier[0]][$this.order_identifier[1]];//ascending

            $this.changeOrder();
        })
        .each(function(header,h){
            var cell_width = $this.x_scale(h+1)-$this.x_scale(h);
            h.bkg_width = cell_width;

            d3.select(this).append("title")
                .text($this.column_labels.titles[h]);

            d3.select(this).append("rect")
                .attr("class","bkg")
                .attr("width", h.bkg_width)
                .attr("height", colHeaderH);

            d3.select(this).append("text")
                .attr("x", h.bkg_width/2)
                .attr("y", colHeaderH/2+4.5)//to center...ugly
                .text(function(d){ return d.name; });

            d3.select(this).selectAll(".img-sort")
                .data([[h,0], [h,1]])//data are pairs [h,1 or -1] with h the header index and 0/1 descending/ascending
                .enter()
                .append("svg:path")
                .attr("class","img-sort")
                .attr("d", function(d){
                    if(d[1] == 1){//go down
                        return "M 0,0 l "+arrow_width+" 0 l -"+(arrow_width/2)+" "+arrow_height+" l -"+(arrow_width/2)+" -"+arrow_height+" z";
                    }
                    else{//go up
                        return "M 0,0 l "+arrow_width+" 0 l -"+(arrow_width/2)+" -"+arrow_height+" l -"+(arrow_width/2)+" "+arrow_height+" z";
                    }
                })
                .attr("transform", function(d){
                    var dy = d[1] == 1 ? -arrow_height/2+1 : arrow_height/2;
                    return "translate("+[cell_width-arrow_width-2,colHeaderH/2+dy]+")";
                })
                .style("visibility","hidden");
        });



    //---------------------------------------------------------------//
    //------------------------Data rows------------------------------//
    //---------------------------------------------------------------//
    this.tableGroup.selectAll(".row-group")
        .data(this.nodes)
        .enter().append("g")
        .attr("class", "row-group")
        .attr("transform", function(d, i) { return "translate(0," + $this.y_scale(i) + ")"; })
        .each(doRow);


    function doRow(row,r) {

        var cell = d3.select(this).selectAll(".cell")
            .data(row.data.map(function(v,i){
            return {value: v, index:i};
        }))
            .enter()
            .append("g")
            .attr("transform", function(d,i){
                return "translate("+[$this.x_scale(i),0]+")"
            })
            .attr("class", "cell");

        cell.append("rect")
            .attr("class","bkg")
            .attr("width", function(d,i){
                return $this.x_scale(i+1)-$this.x_scale(i);
            })
            .attr("height", $this.y_scale.rangeBand());

        cell.each(function(d,i){
            d3.select(this).append("text")
                .attr("class","value")
                .attr("x", ($this.x_scale(i+1)-$this.x_scale(i))/2)
                .attr("y", $this.y_scale.rangeBand()/2+6)//to center...ugly
                .text(function(d){
                    if(i==RANK){
                        d.value = $this.order.indexOf(row.data[TEAM_ID]);
                        return d.value+1;
                    }
                    else if(i==TEAM_ID){
                        return unique_teams[d.value];
                    }
                    else return d.value;
                });
            if(i==TEAM_ID){
                var w = 12,
                    h = 10,
                    arrow_path = "M "+(-w/2)+" 0 v "+(-h/4)+" h "+(3*w/5)+" v "+(-h/4)+" l "+(2*w/5)+" "+(h/2)+" l "+(-2*w/5)+" "+(h/2)+" v "+(-h/4)+" h "+(-3*w/5)+" Z";

                d3.select(this)
                    .append("g")
                    .attr("transform", "translate("+[$this.x_scale(i+1)-$this.x_scale(i)-w-5,$this.y_scale.rangeBand()/2]+")")
                    .append("svg:path")
                    .attr("d",arrow_path)
                    .attr("class","shadow-arrow")
                    .style("opacity",0);

                w = 6;
                d3.select(this)
                    .append("rect")
                    .attr("class","team-name-checkbox")
                    .attr("x",w)
                    .attr("y",$this.y_scale.rangeBand()/2-w/2)
                    .attr("width",w)
                    .attr("height",w)
                    .style("stroke-width",1)
                    .style("stroke","black")
                    .style("fill","lightgray");

            }
        });
    }

    //---------------------------------------------------------------//
    //--------------------------Area Lines---------------------------//
    //---------------------------------------------------------------//
    this.tableGroup.selectAll(".area-line")
        .data([PODIUM_RANK,EUROPE_RANK,RELEGATION_RANK-1])
        .enter()
        .append("line")
        .attr("class","area-line")
        .attr({
            x1:0,
            y1: function(d){return colHeaderH + $this.y_scale.rangeBand() * d},
            x2: $this.x_scale.range()[$this.x_scale.range().length-1],
            y2: function(d){return colHeaderH + $this.y_scale.rangeBand() * d}
        });


    //---------------------------------------------------------------//
    //------------------------Table Slider---------------------------//
    //---------------------------------------------------------------//
    params.slider.parentSVG = svg;
    params.slider.max = this.nbDays-1;
    params.slider.min = 0;
    if(this.hasSlider) this.slider = new Slider(params.slider);

    this.tableGroup.moveToFront();
};

Table.prototype.createNoneInteractions = function(){
    this.tableGroup.select('.chart-group').remove();
    var cells = d3.selectAll('.cell');
    var $this = this;

    cells.on("click", null)
        .on("mouseover", null)
        .on("mouseout", null)
        .on('mousedown.drag', null);
    cells.selectAll(".interactionLayer").remove();//remove the interaction layer, if exist
    cells.select("text.value")
        .transition()
        .duration(200)
        .attr("x", function(d,i){return ($this.x_scale(d.index+1)-$this.x_scale(d.index))/2})
        .attr("y", $this.y_scale.rangeBand()/2+6);
};

//---------------------------------------------------------------//
//---------------------DIRECT MANIPULATION-----------------------//
//---------------------------------------------------------------//
Table.prototype.createLineChartInteraction = function(){
    //console.log("direct manipulation");
    var $this = this;

    d3.selectAll('.cell')
        .on("click", function(c){$this.highlightClickCell(this,c)})
        .on("mouseover", function(d) {
            d3.select(this).classed("overed",true);
            if(d.index == TEAM_ID) d3.select(this).style("cursor","pointer");
        })
        .on("mouseout", function() {
            d3.select(this).classed("overed",false);
        });
};




Table.prototype.highlightClickCell = function(this_cell,c){
    var $this = this;

    var colID = c.index,
        teamID = d3.select(this_cell).node().parentNode.__data__.index;

    if(c.index != TEAM_ID && !this.isTeamSelected(teamID)){
        $this.selectTeam(teamID,"table-interaction");
    }
    if(c.index == TEAM_ID) {
        $this.selectTeam(teamID,"table");
        return;
    }

    //create the linechart
    $this.lineChart.create(teamID,colID,$this.data_index);

    //the transitions

    //step 1: compress the rows
    var t1 = d3.transition()
        .duration(500);
        //.ease("linear");

    //the headers
    var col_headers = t1.selectAll(".col-header")
        .attr("transform", function(d,i){
            if(i == colID) d.transform_compressed = "translate("+[$this.x_scale(RANK),0]+")";
            else if(i < colID) d.transform_compressed = "translate("+[$this.x_scale(RANK),0]+")";
            else d.transform_compressed = "translate("+[$this.x_scale.range()[$this.x_scale.range().length-1],0]+")";
            return d.transform_compressed;
        });
    col_headers.select(".bkg")
        .attr("width", function(d,i){
            if(i == colID) d.bkg_width_compressed = $this.x_scale.range()[$this.x_scale.range().length-1]-$this.x_scale(0);
            else d.bkg_width_compressed = 0;
            return d.bkg_width_compressed;
        });
    col_headers.select("text")
        .attr("x",function(d,i){ return d.bkg_width_compressed/2})
        .style("opacity",function(d,i){
            if(i == colID) return 1;
            else return 0;
        });
    col_headers.each(function(d,i){
        d3.select(this).selectAll(".img-sort")
            .style("opacity",function(){
                if(i == colID) return 1;
                else return 0;
            });
    });

    //the cells
    var cells = t1.selectAll(".row-group").selectAll(".cell")
        .attr("transform", function(d,i){
            return col_headers[0][d.index].__data__.transform_compressed;
        });
    cells.select(".bkg")
        .attr("width", function(d,i){
            return col_headers[0][d.index].__data__.bkg_width_compressed;
        });
    cells.select("text")
        .attr("x",function(d,i){
            if(i==colID) return $this.lineChart.getXOnLineChart(d.index);
            return col_headers[0][d.index].__data__.bkg_width_compressed/2;
        })
        .style("opacity",function(d,i){
            if(d.index == colID) return 1;
            else return 0;
        });


    //step 2: make rows disappear and the logos appear
    var logos_data = [];
    var tLineChart = d3.transform($this.lineChart.groupSVG.attr("transform")).translate;
    this.tableGroup.selectAll(".row-group")
        .each(function(row,r){
            var tRow = d3.transform(d3.select(this).attr("transform")).translate;
            d3.select(this).selectAll(".cell")
                .filter(function(d,i){return i == colID})
                .each(function(cell,c){
                    var tCell = d3.transform(d3.select(this).attr("transform")).translate;
                    logos_data[r] = {teamID:row.index, tr_init: "translate("+[
                        //col_headers[0][colID].__data__.bkg_width_compressed/2-tLineChart[0],
                        $this.lineChart.getXOnLineChart(r),
                        tRow[1]+tCell[1]+$this.colHeaderH/2-tLineChart[1]
                    ]+")"};
                })
        });

    $this.lineChart.groupSVG.selectAll(".team-logo-cell")
        .data(logos_data)
        .enter()
        .append("image")
        .attr("class","team-logo-cell")
        .each(function(d,i){
            var attr = $this.lineChart.getLogoAttributes(d.teamID,teamID);
            d3.select(this).attr("xlink:href", "./img/"+attr.name+".png")
                .attr("transform", function(d){return d.tr_init})
                .attr("x", -attr.width/2)
                .attr("y", -attr.width/2)
                .attr("width", attr.width)
                .attr("height", attr.width)
                .style("opacity", attr.selected ? 1 : 0);
        });

    var t2 = t1.transition();
    t2.select(".cells-group").selectAll(".row-group,.table-bkg,.area-line")
        .style("opacity",0);


    //step 3: move the logos on the lines
    var t3 = t2.transition();

    t3.selectAll(".team-logo-cell")
        .attr("transform", function(d){
            //find the position on the linechart for each team
            return $this.lineChart.getTransformOnLineChart(d.teamID);
        });


    //step 4: make the linechart appear
    t3.each("end", function(){
        var duration = 500;
        $this.lineChart.showLineChart(duration);

    });

};



Table.prototype.leaveLineChartMode = function(teamID, colID){
    var $this = this;

    var col_headers = d3.selectAll(".col-header");

    //put the cells text where it will appear
    $this.tableGroup.selectAll(".row-group").each(function(row,r){
        d3.select(this).selectAll(".cell text")
            .each(function(d,i){
                if(d.index == colID){
                    d3.select(this).attr("x",function(){
                        if(i==colID) return $this.lineChart.getXOnLineChart(r);
                    });
                }
            });
    });



    //the transitions

    //step 1: make the linechart disappear
    var t1 = d3.transition()
        .duration(500);
        //.ease("linear");

    t1.each(function(){
        $this.lineChart.hideAllElements(500);
    });

    //step 2: move the mousemove logos to the text position
    var t2 = t1.transition();

    t2.selectAll(".team-logo-mousemove")
        .filter(function(d){return $this.isTeamSelected(d)})
        .attr("transform", function(d,i){
            //find the new position in the table for each team
            return "translate("+
                [
                    $this.lineChart.getXOnLineChart(i),
                    $this.y_scale(d) - $this.colHeaderH/2
                ]+")";
        });

    //step 3: make the logos disappear and rows appear
    var t3 = t2.transition();
    t3.select(".cells-group").selectAll(".row-group,.table-bkg")
        .style("opacity",1);
    t3.selectAll(".team-logo-mousemove")
        .style("opacity",0);

    t3.each("end", function(){$this.lineChart.removeFloatingElements();});//remove the logos

    //step 4: uncompress the rows
    var t4 = t3.transition();

    //the headers
    col_headers = t4.selectAll(".col-header")
        .attr("transform", function(d,i){
            return d.transform_init;
        });
    col_headers.select(".bkg")
        .attr("width", function(d,i){
            return d.bkg_width;
        });
    col_headers.select("text")
        .attr("x",function(d,i){return d.bkg_width/2})
        .style("opacity",1);
    col_headers.selectAll(".img-sort")
        .style("opacity",1);

    //the cells
    var cells = t4.selectAll(".row-group").selectAll(".cell")
        .attr("transform", function(d){
            return col_headers[0][d.index].__data__.transform_init;
        });
    cells.select(".bkg")
        .attr("width", function(d){
            return col_headers[0][d.index].__data__.bkg_width;
        });
    cells.select("text")
        .attr("x",function(d){
            return col_headers[0][d.index].__data__.bkg_width/2;
        })
        .style("opacity",1);

    t4.selectAll(".area-line").style("opacity",1);

    //double check that there is no ghost on the slider
    t4.each("end", function(){$this.slider.setGhosts([]);})

};






//---------------------------------------------------------------//
//---------------------------TANGLE------------------------------//
//---------------------------------------------------------------//
Table.prototype.createTangleInteraction = function(){
    var $this = this;
    //console.log("tangle");

    var drag = d3.behavior.drag()
        .origin(Object)
        .on("dragstart", function(d){$this.tangle.startDrag(d,this)})
        .on("drag", function(d){$this.tangle.moveDrag(d,this)})
        .on("dragend", function(d){$this.tangle.endDrag(d,this)});

    d3.selectAll('.cell')
        .on("click", function(c){$this.highlightClickCell(this,c)})
        .on("mouseover", function(d) {
            d3.select(this).classed("overed",true);
            if(d.index == TEAM_ID) d3.select(this).style("cursor","pointer");
        })
        .on("mouseout", function() {
            d3.select(this).classed("overed",false);
        })
        .call(drag);
};







Table.prototype.isTeamSelected = function(teamID){
    return this.selected_teams.indexOf(teamID) != -1;
};

Table.prototype.highlightSelectedTeams = function(){
    var $this = this;
    d3.selectAll(".row-group").each(function(d,i){
        d3.select(this).selectAll(".cell")
            .each(function(cell,c){
                d3.select(this).select(".bkg")
                    .style("fill", $this.isTeamSelected(i) ? getTeamColorsFromTeamID(i).primary : "white")
                    .style("fill-opacity", ".3");
                if(c == TEAM_ID){
                    d3.select(this).select(".team-name-checkbox")
                        .style("fill",$this.isTeamSelected(i) ? "black" : "lightgray");
                }
            });
    });
};

Table.prototype.selectTeam = function(teamID,origin){
    var $this = this;
    if($this.isTeamSelected(teamID)) $this.selected_teams.splice($this.selected_teams.indexOf(teamID),1);
    else $this.selected_teams.push(teamID);
    this.highlightSelectedTeams();
};


/*
 Compute the orders according to some rules:
 by team name: alphabetical order
 by points:          points then goal difference then scored goals then alphabetical order
 by home points:     home points then goal difference then scored goals then alphabetical order
 by away points:     away points then goal difference then scored goals then alphabetical order
 by scored goals:    scored goals then alphabetical order
 by conceded goals:  conceded goals then alphabetical order
 by goal diff:       goal diff then alphabetical order
 */
Table.prototype.computeOrders = function(){
    var $this = this;
    //precompute the orders
    this.orders = [];
    this.column_labels.names.forEach(function(name,i){
        $this.orders[i] = [
            rankings[$this.data_index][i],
            rankings[$this.data_index][i].slice().reverse()
        ];
    });
};





/*-----------------------------------------------------------------------
 UPDATE METHODS
 ----------------------------------------------------------------------*/


/*
 Reorder the table
 */
Table.prototype.changeOrder = function(isInitCall){
    var $this = this;

    this.tangle.setColOrder($this.order_identifier[0]);

    d3.selectAll(".col-header").each(function(d,i){
        if(i == $this.order_identifier[0]){
            d3.select(this).classed("sorted",true);
            d3.select(this).selectAll(".img-sort").style("visibility", function(d){return d[1] == $this.order_identifier[1] ? "visible" : "hidden"});
        }
        else{
            d3.select(this).classed("sorted",false);
            d3.select(this).selectAll(".img-sort").style("visibility","hidden");
        }
    });

    this.y_scale.domain(this.order);//reorder the nodes

    //update the rank of all lines
    d3.selectAll(".row-group")
        .each(function(row){
            d3.select(this).selectAll(".cell")
                .filter(function(d){return d.index == RANK})
                .select("text")
                .text(function(d){
                    d.value = $this.order.indexOf(row.data[TEAM_ID]);
                    return d.value+1
                });
        });

    d3.selectAll(".row-group")
        .transition()
        .duration(this.animations.sort.duration)
        .delay(function(d, i) { return $this.y_scale(i) * $this.animations.sort.delay; })
        .attr("transform", function(d, i) { return "translate("+[0,$this.y_scale(i)]+")"; })

};

Table.prototype.changeDay = function(new_day){
    this.data_index = new_day;

    var $this = this;

    //update the nodes
    this.data[this.data_index].forEach(function(d,i){
        //find the corresponding bind data
        for(var n in $this.nodes){
            if($this.nodes[n].data[TEAM_ID] == d[TEAM_ID]){
                $this.nodes[n].data = d;
                break;
            }
        }
    });

    //update the orders
    this.computeOrders();
    this.order = this.orders[$this.order_identifier[0]][$this.order_identifier[1]];

    //update the y_scale demain, according to new order
    this.y_scale.domain(this.order);

    //update the data rows
    this.tableGroup.selectAll(".row-group")
        .data(this.nodes)
        .transition()
        .duration(this.animations.change.duration)
        .delay(function(d, i) { return $this.y_scale(i) * $this.animations.change.delay; })
        .attr("transform", function(d, i) { return "translate(0," + $this.y_scale(i) + ")"; })
        .each(doRow);

    function doRow(row) {
        var cell = d3.select(this).selectAll(".cell")
            .data(row.data.map(function(v,i){
            return {value: v, index:i};
        }));

        cell.each(function(d,i){
            d3.select(this).select("text")
                .text(function(){
                    if(i==RANK){
                        d.value = $this.order.indexOf(row.data[TEAM_ID]);
                        return d.value+1;
                    }
                    else if(i==TEAM_ID){//if team name
                        return unique_teams[d.value];
                    }
                    else return d.value;
                });
        });
    }
};


/*
 action: "sort", "change"
 type: "duration", "delay"
 */
Table.prototype.setAnimation = function(action, type, duration){
    this.animations[action][type] = duration;
};

Table.prototype.setInteractionMode = function(_mode,isInit){
    if(_mode == this.mode) return;
    this.createNoneInteractions();
    if(_mode == "Tangle") this.createTangleInteraction();
    else if(_mode == "LineChart") this.createLineChartInteraction();
};