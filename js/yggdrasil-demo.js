// constants
const width = $(window).width() * 0.7;
const height = $(window).height() * 0.8;
const K = 4; // num. workers
const NODE_RADIUS = 70;
const NODE_OFFSET = (width - 2*NODE_RADIUS*K) / (K + 1);
const FEATURE_OFFSET = 30;
const FEATURES = [
        "bath",
        "beds",
        "elevation",
        "price",
        "price_per_sqft",
        "sqft",
        "year_built",
      ];

var svg = d3.select('#yggdrasil-demo').append('svg')
  .attr('width', width)
  .attr('height', height);

var nodeLabels = ['master'];
for (var i = 0; i < K; ++i) {
  nodeLabels.push('worker');
}

function getNodeCoordinates(index) {
  if (index == 0) {
    return {
      x: (width / 2),
      y: (1.1*NODE_RADIUS)
    };
  } else {
    return {
      x: ((index - 1)*(2*NODE_RADIUS + NODE_OFFSET) + NODE_RADIUS + NODE_OFFSET),
      y: (height / 2 + NODE_RADIUS)
    };
  }
}

function createMasterAndWorkers(labels) {
  var nodes = svg.selectAll("g.node").data(nodeLabels);

  var newNodes = nodes.enter()
    .append("g")
    .attr('class', 'node')
    .attr("transform", function(d, i) {
      var nodeCoords = getNodeCoordinates(i);
      return "translate(" + nodeCoords.x + ", " +  nodeCoords.y + ")";
    });

  newNodes.append("circle")
    .attr("r", NODE_RADIUS)
    .style("stroke", "#000")
    .style("fill", function(d, i) {
      if (i == 0) {
        return "#f6f6f6";
      } else {
        return "#eaeaea";
      }
    });

  newNodes.append("text")
    .attr('class', 'node-label')
    .attr('text-anchor', 'middle')
    .attr('dx', 0)
    .attr('dy', 10)
    .style('font-size', '0.7em')
    .text(function(d) { return d });
}

createMasterAndWorkers(nodeLabels);

function update(featureData, partitions) {
  var positionFeature = function(d, i) {
    debugger;
    var locInfo = partitions[i];
    var nodeCoords = getNodeCoordinates(locInfo.node);
    return "translate(" + nodeCoords.x + ", " +  (nodeCoords.y + 1.3*NODE_RADIUS + locInfo.index*FEATURE_OFFSET) + ")";
  };

  var features = svg.selectAll('g.feature').data(featureData);
  features.transition()
    .attr('transform', positionFeature)
    .duration(750)
    .style('fill-opacity', 1);

  features.enter().append('g')
    .attr('class', 'feature')
    .attr('transform', positionFeature)
    .append('text')
    .attr('class', 'feature-label')
    .attr('text-anchor', 'middle')
    .style('font-size', '0.6em')
    .text(_.identity)
    .attr('fill', 'blue')
    .attr('y', 0);

  features.exit().remove();
}

var allOnMaster = [];
for (var i = 0; i < FEATURES.length; ++i) {
  allOnMaster.push({
    node: 0,
    index: i
  });
}
update(FEATURES, allOnMaster);

// Divide up the features amongst the workers
function partition() {
  console.log("calling partition!");
  var features = _.shuffle(FEATURES);
  console.log(features);
  var partitionedToWorkers = [];
  for (var i = 0; i < FEATURES.length; ++i) {
    partitionedToWorkers.push({
      node: Math.floor(i % K) + 1,
      index: Math.floor(i / K)
    });
  }
  update(features, partitionedToWorkers);
}
setInterval(partition, 2000);









// Data by columns
var dataByColumns = _.object(FEATURES, _.map(FEATURES, function(feature) {
  return _.shuffle(_.map(tree_training_set, function(datum) {
    return datum[feature];
  }));
}));

// sort all of them initially
dataByColumns = _.object(FEATURES, _.map(dataByColumns, function(x) { return _.sortBy(x);}))

var HousingAxisHistogram = Backbone.View.extend({
  initialize: function(args) {
    this.data = args.data;
    this.key = args.key;
    this.g = args.g;

    if (typeof args.split === "number" && !isNaN(args.split)) {
      this.split = args.split;
    } else {
      this.split = null;
    }

    this.width = 100;
    this.height = 25;
    this.orientation = "HORIZONTAL";

    this.barWidth = 2;
    this.barGap = 1;
    this.growth = 1;

    this.handleResize({
      width: this.width,
      height: this.height
    });

    this.cid = this.cid + "HousingAxisHistogram"

    this.rr = true;
    R2D3Views.push(this);
  },
  handleResize: function(args) {
    _.extend(this, args);

    if(this.orientation == "HORIZONTAL") {
      this.valueEdge = this.width;
      this.magnitudeEdge = this.height
    } else {
      this.valueEdge = this.height;
      this.magnitudeEdge = this.width
    }

    if(args.barWidth) { this.barWidth = args.barWidth; }
    if(args.barGap) { this.barGap = args.barGap; }

    this.sectionWidth = this.barWidth * 2 + this.barGap;
    this.binsCount = Math.floor(this.valueEdge/this.sectionWidth);
    this.binnedData = BinContinuousDataByPredicate({
      data: this.data,
      key: this.key,
      predicate: isTargetFn,
      bins: this.binsCount
    });

    if(this.fixedMagnitude) {
      this.max = this.fixedMagnitude;
    } else {
      this.max = this.binnedData.max;
    }

    this.binScale = d3.scale.linear()
      .domain([0, this.max])
      .range([0, this.magnitudeEdge * this.growth]);

    if(this.split) {
      // If there's a split value, show it.

      var v = this;
      var extent = d3.extent(this.data, function(s) {
        return s[v.key];
      });

      this.split_location = this.valueEdge / (extent[1] - extent[0]) * (this.split - extent[0]);
    }

    this.rr = true;
  },
  setBarGrowth: function(growth) {
    if(this.growth != growth) {
      this.growth = growth;

      this.binScale = d3.scale.linear()
        .domain([0, this.max])
        .range([0, this.magnitudeEdge * this.growth]);

      this.rr = true;
    }
  },
  render: function() {
    var v = this;

    this.selection = d3.select(this.g).selectAll(".bin")
      .data(this.binnedData.bins)

    this.selection.exit().remove()

    this.selection
      .enter()
      .append("g")
        .attr("class", "bin")

    this.selection
      .attr("transform", function(d, i) {
        if(v.orientation == "HORIZONTAL") {
          return "translate("+(i*v.sectionWidth)+",0)";
        } else {
          return "translate(0,"+(i*v.sectionWidth)+")";
        }
      })
      .each(function(d) {
        d3.select(this).selectAll("rect").remove()

        d3.select(this)
          .append("rect")
            .attr("class", "isTarget")
            .attr("width", function(d) {
              if(v.orientation == "HORIZONTAL") {
                return v.barWidth;
              } else {
                return v.binScale(d.isTarget);
              }
            })
            .attr("height", function(d) {
              if(v.orientation != "HORIZONTAL") {
                return v.barWidth;
              } else {
                return v.binScale(d.isTarget);
              }
            })
            .attr("y", function(d) {
              if(v.orientation == "HORIZONTAL") {
                return v.magnitudeEdge - v.binScale(d.isTarget);
              } else {
                return 0
              }
            })
            .attr("x", function(d) {
              if(v.orientation != "HORIZONTAL") {
                return v.magnitudeEdge - v.binScale(d.isTarget);
              } else {
                return 0
              }
            })
            .attr("fill", FILL_FN("isTarget"))

        d3.select(this)
          .append("rect")
            .attr("class", "isNotTarget")
            .attr("width", function(d) {
              if(v.orientation == "HORIZONTAL") {
                return v.barWidth;
              } else {
                return v.binScale(d.isNotTarget);
              }
            })
            .attr("height", function(d) {
              if(v.orientation != "HORIZONTAL") {
                return v.barWidth;
              } else {
                return v.binScale(d.isNotTarget);
              }
            })
            .attr("y", function(d) {
              if(v.orientation == "HORIZONTAL") {
                return v.magnitudeEdge - v.binScale(d.isNotTarget);
              } else {
                return v.barWidth
              }
            })
            .attr("x", function(d) {
              if(v.orientation != "HORIZONTAL") {
                return v.magnitudeEdge - v.binScale(d.isNotTarget);
              } else {
                return v.barWidth
              }
            })
            .attr("fill", FILL_FN("isNotTarget"))
      });

    if (this.split_location) {
      this.split_path = d3.select(this.g).select(".split_path");

      if(this.split_path.empty()) {
        this.split_path = d3.select(this.g).append('path')
          .attr("fill", "#888888")
          .classed("split_path", true);
      }

      var x = this.split_location;
      var y = this.magnitudeEdge + 5;

      var path = '';
      path += 'M ' + x + ' ' + y + ' ';
      path += 'L ' + (x + 4) + ' ' + (y + 4) + ' ';
      path += 'L ' + (x - 4) + ' ' + (y + 4) + ' ';
      path += 'Z';

      this.split_path.attr("d", path);
    }

    return this;
  }
});

// Shuffle code from Vadim
// var cards = [
//   "J\u2665", "J\u2666", "J\u2663", "J\u2660",
//   "K\u2665", "K\u2666", "K\u2663", "K\u2660",
//   "Q\u2665", "Q\u2666", "Q\u2663", "Q\u2660",
//   "A\u2665", "A\u2666", "A\u2663", "A\u2660"]
//
// cards.sort(function() {return Math.random()-.5})
//
// var svg = d3.select("div.output svg")
//
// var selection = svg.selectAll("text")
//   .data(cards, String)
//
// selection
//   .transition().duration(500)
//   .attr("x", function(d,i) {return (i%8)*30+30})
//   .transition().duration(500).delay(500)
//   .attr("y", function(d,i) { return i*35+40 })
//   .transition().duration(500).delay(1000)
//   .attr("x", 30)
//
// selection.enter().append("text")
//   .attr("x", 30)
//   .attr("y", function(d,i) { return i*35+40 })
//   .style("fill", function(d) {
//       return "\u2665\u2666".indexOf(d[1]) < 0 ?
//         "black" : "red";
//     })
//   .style("font", "20px monospace")
//   .text(String)


// var WorkerView = Backbone.View.extend({
//   initialize: function(args) {
//     this.cid = this.cid + "WorkerView";
//     var v = this;
//
//     // this.g = args.g;
//     this.workerId = args.workerId;
//     this.features = args.features;
//
//     this.histogram = d3.select(this.g)
//       .append("g")
//       .attr("class", "tree-histogram");
//
//     this.histogram
//       .each(function() {
//         this.view = new HousingAxisHistogram({
//           g: this,
//           data: v.stats.data,
//           key: v.stats.attribute,
//           split: parseFloat(v.stats.split_point)
//         });
//
//         this.view.fixedMagnitude = v.fixedMagnitude;
//       });
//
//     // Pie Chart
//     this.pieChartLayer = d3.select(this.g)
//       .append("g")
//       .attr("class", "tree-pie")
//       .attr("opacity", 0);
//
//     var path = this.pieChartLayer.append("path")
//       .attr("fill", "none")
//
//     if (!args.links) {
//       path
//       .attr("stroke-dasharray", "6,5")
//       .attr("stroke", "#666666");
//     } else {
//       path
//       .attr("stroke", "#000000");
//     }
//
//     this.pieChart = new TreePieView({
//       g: this.pieChartLayer,
//       data: {
//         total: this.stats.data.length,
//         parts: [
//           { key: "isTarget", count: this.stats.data_rows['true'].length },
//           { key: "isNotTarget", count: this.stats.data_rows['false'].length }
//         ]
//       },
//       key: v.stats.attribute,
//       total_data_count: tree_training_set.length
//     });
//
//     this.verticalOffsetThreshold = function(scroll) { return 0; }
//     this.verticalOffset = 0;
//
//     this.label = d3.select(this.g)
//       .append("text")
//       .attr("font-size", 12)
//       .attr("font-weight", 600)
//       .attr("fill", "#555555")
//       .attr("text-anchor", "middle");
//
//     this.listenTo(Dispatcher, "scroll", this.handleScroll);
//     this.rr = true;
//     R2D3Views.push(this);
//   },
//
//   handleResize: function(args) {
//     var v = this;
//
//     this.width = args.width;
//     this.height = args.height;
//
//     this.start = args.start;
//     this.end = args.end;
//
//     var windowHeight = $window.height();
//
//     this.histogram.each(function() {
//       this.view.handleResize({
//         width: v.width,
//         height: v.height,
//         barWidth: 2,
//         barGap: 1
//       });
//     });
//
//     var domain = [
//       0 + 45,
//       0 + 45, // both off
//       2 + 45 + this.depth*5, // pie on
//       6 + 45 + this.depth*5, // pie off, histogram on
//       7 + 45 + this.depth*5,
//       11 + 45 + this.depth*5, // histogram faded
//     ]
//
//     // Histogram Threshold
//     this.histogramOpacityThreshold = d3.scale.threshold()
//       .domain(domain)
//       .range([0,0,0,0,1,1,0.3]);
//
//     // Pie Thresholds
//     var pieFading = 0;
//     var pieCenterOffset = windowHeight * 0.4 / this.maxDepth;
//
//     if(!this.links) {
//       pieFading = 1;
//
//       var distanceToGo = (this.maxDepth - this.depth) * (windowHeight * 0.45) / this.maxDepth;
//
//       this.verticalOffsetThreshold = d3.scale.linear()
//         .domain([this.depth*5 + 45, 85])
//         .range([pieCenterOffset,distanceToGo + pieCenterOffset]);
//     } else {
//       this.verticalOffsetThreshold = function(scroll) {
//         return pieCenterOffset;
//       }
//     }
//
//     this.pieOpacityThreshold = d3.scale.threshold()
//       .domain(domain)
//       .range([0,0,0,1,pieFading,pieFading,pieFading]);
//
//     this.pieChart.handleResize({
//       maxRadius: this.height
//     });
//
//     this.label
//       .attr('y', v.height + 22);
//
//     this.rr = true;
//   },
//
//   handleScroll: function(scroll) {
//     var newHistogramOpacity = this.histogramOpacityThreshold(scroll);
//     var newPieOpacity = this.pieOpacityThreshold(scroll);
//     var newVerticalOffset = this.verticalOffsetThreshold(scroll);
//     if(this.histogramOpacity != newHistogramOpacity ||
//         this.verticalOffset != newVerticalOffset ||
//         this.pieOpacity != newPieOpacity) {
//       this.histogramOpacity = newHistogramOpacity;
//       this.pieOpacity = newPieOpacity;
//       this.verticalOffset = newVerticalOffset;
//       this.rr = true;
//     }
//   },
//
//   render: function() {
//     var v = this;
//
//     this.histogram
//       .attr("transform", "translate("+(-this.width/2)+",0)")
//       .attr("opacity", this.histogramOpacity);
//
//     this.pieChartLayer
//       .attr("opacity", this.pieOpacity)
//       .attr("transform", "translate(0,"+this.verticalOffset+")");
//
//     this.pieChartLayer.select("path")
//       .attr("opacity", this.pieOpacity)
//       .attr("d", function() {
//         var x1 = 0;
//         var y1 = 0;
//         var x2 = 0;
//         var y2 = -v.verticalOffset;
//
//         var d = "M " + x1 + " " + y1 + " ";
//         d += "L " + x2 + " " + y2 + " ";
//
//         return d;
//       });
//
//     if (this.stats.attribute) {
//       this.label
//         .text(DIMENSION_LONGFORM[this.stats.attribute][LANG])
//         .attr("opacity", this.histogramOpacity);
//     }
//
//
//     if(this.links) {
//       d3.selectAll(this.links)
//         .attr("opacity", this.histogramOpacity);
//     }
//   }
// });
//
// _.each(featuresPerNode, function(cols, index) {
//   var worker = new WorkerView({
//     // g: this,
//     workerId: index,
//     features: cols
//   });
// });
//
//
