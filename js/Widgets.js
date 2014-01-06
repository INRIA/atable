/*
 2014/01/06
 Charles Perin
 INRIA, Univ. Paris-Sud & CNRS-LIMSI
 charles.perin@free.fr
 */


var ARROW_LEFT = 0,
    ARROW_RIGHT = 1;

Widgets = function(params){
    this.widgets = [];
    this.min_day = 0;
    this.max_day = params.nb_days-1;
    if(params.basic.on) {
        this.widgets.push(new ArrowWidget({side: ARROW_LEFT, id: params.basic.id, handler:this}));
        this.widgets.push(new DropDownWidget({id: params.basic.id, handler:this}));
        this.widgets.push(new ArrowWidget({side: ARROW_RIGHT, id: params.basic.id, handler:this}));
    }
    if(params.slider_classic.on){
        this.widgets.push(new SliderWidget({id: params.slider_classic.id, handler:this}));
    }
};

Widgets.prototype.addWidget = function(widget){
    if(this.widgets.indexOf(widget == -1)) this.widgets.push(widget);
};

Widgets.prototype.setValue = function(new_day){
    if(new_day != current_day){
        current_day = new_day;
        this.widgets.forEach(function(widget){
            widget.setValue(new_day);
        });
        table.changeDay(new_day);
    }
};

/*
Event fired by the slider custom widget
 */
Widgets.prototype.sliderChanged = function(type, value){
    this.setValue(value);
};


AbstractWidget = function(params){
    this.handler = params.handler;
    this.dom_id = params.id;
    this.isAnimate = true;
};

AbstractWidget.prototype.setAnimate = function(isAnimate){
    this.isAnimate = isAnimate;
};


/*
params:
side:   0 = go left (previous)
        1 = go right (next)
 */
ArrowWidget = function(params){
    this.__proto__.__proto__.constructor.apply(this, [params]);
    this.side = params.side;
    this.init();
};

//inherits AbstractWidget prototypes
ArrowWidget.prototype = Object.create(AbstractWidget.prototype);

ArrowWidget.prototype.init = function(){
    var $this = this;
    var arrow = d3.select("#"+this.dom_id).append("a")
        .attr("href","#")
        .attr("id",function(){
            if($this.side == ARROW_LEFT) return "widget-arrow-previousDay";
            return "widget-arrow-nextDay";
        })
        .attr("class","widget-arrow-days")
        .style("padding-right",function(){
            if($this.side == ARROW_LEFT) return "10px";
            return "0px";
        })
        .style("padding-left",function(){
            if($this.side == ARROW_RIGHT) return "10px";
            return "0px";
        })
        .append("img")
        .attr("src",function(){
            if($this.side == ARROW_LEFT) return "./img/1leftarrow.png";
            return "./img/1rightarrow.png";
        })
        .attr("width",16)
        .attr("height",16);

    arrow.on("click",function(){
        var new_day;
        if($this.side == ARROW_RIGHT) new_day = Math.min($this.handler.max_day, current_day+1);
        else new_day = Math.max(0, current_day-1);
        $this.handler.setValue(new_day);
    });
};

ArrowWidget.prototype.setValue = function(new_day){

};



DropDownWidget = function(params){
    this.__proto__.__proto__.constructor.apply(this, [params]);
    this.init();
};

//inherits AbstractWidget prototypes
DropDownWidget.prototype = Object.create(AbstractWidget.prototype);

DropDownWidget.prototype.init = function(){
    var $this = this;

    var select = d3.select("#"+this.dom_id).append("select")
        .attr("id", "widget-dropdown-select");

    var data = [];
    for(var i=this.handler.min_day; i<=this.handler.max_day;i++)
        data.push(i);

    select.selectAll(".widget-dropdown-option")
        .data(data)
        .enter()
        .append("option")
        .attr("name", "widget-dropdown-option")
        .attr("class", "widget-dropdown-option")
        .attr("value",function(d){return d})
        .html(function(d){return "day "+(d)});

    select.on("change",function(){
        $this.handler.setValue(parseInt($(this).val()));
    });
};

DropDownWidget.prototype.setValue = function(new_day){
    $("#widget-dropdown-select").prop('selectedIndex', new_day);
};




SliderWidget = function(params){
    this.__proto__.__proto__.constructor.apply(this, [params]);
    this.init();
};

//inherits AbstractWidget prototypes
SliderWidget.prototype = Object.create(AbstractWidget.prototype);

SliderWidget.prototype.init = function(){
    var $this = this;

    $("#"+this.dom_id).slider({
        value:0,
        min: 0,
        max: $this.handler.max_day,
        step: 1,
        slide: function( event, ui ) {
            var new_day = ui.value;
            d3.select("#widget-slider-label").html(new_day);
            $this.handler.setValue(new_day);
        }
    });
    d3.select("#"+this.dom_id).select(".ui-slider-handle").append("label")
        .attr("id","widget-slider-label")
        .html(current_day);
};

SliderWidget.prototype.setValue = function(new_day){
    $("#"+this.dom_id).slider("value",new_day);
    //linechart.setValue(new_day);
    d3.select("#widget-slider-label")
        .html(new_day);
};