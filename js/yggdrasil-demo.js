// constants
const width = Math.min($(window).width() * 0.7, 1024);
const height = Math.min($(window).height() * 0.8, 576);
const K = 4; // num. workers
const NODE_RADIUS = 60;
const PADDING_TOP = 40;
const PADDING_BOTTOM = 140;
const PADDING_WIDTH = 140;
const FEATURE_OFFSET = 65;
const BAR_CHART_OFFSET = 5;
const FEATURES = [
        "bath",
        "beds",
        "elevation",
        "price",
        "price_per_sqft",
        "sqft",
        "year_built",
      ];

var _isTargetFn = function(labels) {
  var fn = function(d, i) {
    return labels[i] > 0.5;
  };
  return fn;
}

var BarChart = Backbone.View.extend({
  initialize: function(args) {
    this.key = args.key;
    this.data = args.data;
    this.labels = args.labels;
    this.parentG = args.g;

    if (typeof args.split === "number" && !isNaN(args.split)) {
      this.split = args.split;
    } else {
      this.split = null;
    }

    this.width = 100;
    this.height = 35;
    this.orientation = "HORIZONTAL";

    this.barWidth = 0.75;
    this.barGap = 0;
    this.growth = 1;

    this.handleResize({
      width: this.width,
      height: this.height
    });

    this.cid = this.cid + "BarChart"

    this.rr = true;
    R2D3Views.push(this);
  },
  handleResize: function(args) {
    _.extend(this, args);

    this.valueEdge = this.width;
    this.magnitudeEdge = this.height;

    if (args.barWidth) { this.barWidth = args.barWidth; }
    if (args.barGap) { this.barGap = args.barGap; }

    this.sectionWidth = this.barWidth * 2 + this.barGap;
    this.isTargetPred = _isTargetFn(this.labels);

    var extent = d3.extent(this.data);
    this.barScale = d3.scale.linear()
      .domain([extent[0], extent[1]])
      .range([0, this.magnitudeEdge*this.growth]);

    if (this.split) {
      // If there's a split value, show it.

      var v = this;

      this.split_location = this.valueEdge / (extent[1] - extent[0]) * (this.split - extent[0]);
    }

    this.rr = true;
  },

  render: function(args) {
    _.extend(this, args);
    var v = this;

    // append new group for barChart, position it underneath the label
    // var bbox = this.g.getBBox();

    if (!this.g) {
      this.g = d3.select(this.parentG).append('g')
        .attr('class', 'barChart')
        .attr('transform', 'translate(' + (-3*NODE_RADIUS) + ',' + BAR_CHART_OFFSET + ')');
        //.attr('transform', 'translate(' + (bbox.width / 2 + BAR_CHART_OFFSET) + ',' + -1*bbox.height + ')');
    }

    this.selection = this.g.selectAll('.bin').data(this.data);

    this.selection.exit().remove();

    this.selection
      .enter()
      .append('g')
      .attr('class', 'bin');

    this.selection
      .attr('transform', function(d, i) {
        if (v.orientation == 'HORIZONTAL') {
          return 'translate(' + (i*v.sectionWidth) + ',0)';
        } else {
          return 'translate(0,' + (i*v.sectionWidth) + ')';
        }
      })
      .each(function(d, i) {
        d3.select(this).selectAll('rect').remove()

        d3.select(this)
          .append('rect')
          .attr('class', function(d) {
            return (v.isTargetPred(d, i)) ? 'isTarget' : 'isNotTarget';
          })
          .attr('width', function(d) {
            return v.barWidth;
          })
          .attr('height', function(d) {
            return v.barScale(d);
          })
          .attr('y', function(d) {
            return v.magnitudeEdge - v.barScale(d);
          })
          .attr('x', function(d) {
            return 0
          })
          .attr('fill', function(d) {
            return (v.isTargetPred(d, i)) ? FILL_FN('isTarget') : FILL_FN('isNotTarget');
          });
      });

    // if (this.split_location) {
    //   this.split_path = d3.select(this.g).select('.split_path');

    //   if (this.split_path.empty()) {
    //     this.split_path = d3.select(this.g).append('path')
    //       .attr('fill', '#888888')
    //       .classed('split_path', true);
    //   }

    //   var x = this.split_location;
    //   var y = this.magnitudeEdge + 5;

    //   var path = '';
    //   path += 'M ' + x + ' ' + y + ' ';
    //   path += 'L ' + (x + 4) + ' ' + (y + 4) + ' ';
    //   path += 'L ' + (x - 4) + ' ' + (y + 4) + ' ';
    //   path += 'Z';

    //   this.split_path.attr('d', path);
    // }

    return this;
  }
});


var svg = d3.select('#yggdrasil-demo').append('svg')
  .attr('width', width)
  .attr('height', height);

var nodeLabels = ['master'];
for (var i = 0; i < K; ++i) {
  nodeLabels.push('worker');
}

function getNodeCoordinates(index) {
  switch (index) {
    case 0:
      return {
        x: (width / 2),
        y: (1.1*NODE_RADIUS)
      };
    case 1:
      return {
        x: (NODE_RADIUS + PADDING_WIDTH),
        y: (NODE_RADIUS + PADDING_TOP)
      };
    case 2:
      return {
        x: (NODE_RADIUS + PADDING_WIDTH),
        y: (height - PADDING_BOTTOM - NODE_RADIUS)
      };
    case 3:
      return {
        x: (width - PADDING_WIDTH - NODE_RADIUS),
        y: (NODE_RADIUS + PADDING_TOP)
      };
    case 4:
      return {
        x: (width - PADDING_WIDTH - NODE_RADIUS),
        y: (height - PADDING_BOTTOM - NODE_RADIUS)
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
    var locInfo = partitions[i];
    var nodeCoords = getNodeCoordinates(locInfo.node);
    return 'translate(' + nodeCoords.x + ', ' +  (nodeCoords.y + 1.35*NODE_RADIUS + locInfo.index*FEATURE_OFFSET) + ')';
  };

  var features = svg.selectAll('g.feature').data(featureData);
  features.transition()
    .attr('transform', positionFeature)
    .duration(750)
    .style('fill-opacity', 1);

  features.each(function(d) {
    this.barChart.render({
      data: d.featureValues,
      labels: d.labels
    });
  });

  features.enter().append('g')
    .attr('class', 'feature')
    .each(function(d) {
      this.barChart = new BarChart({
        g: this,
        key: d.featureName,
        data: d.featureValues,
        labels: d.labels,
        split: 50
        // split: parseFloat(v.stats.split_point)
      });
    })
    .attr('transform', positionFeature)
    .append('text')
    .text(function(d) { return d.featureName; })
    .attr('class', 'feature-label')
    .attr('text-anchor', 'middle')
    .style('font-size', '0.55em')
    .attr('fill', 'blue')
    .attr('y', 0);

  features.exit().remove();
}

// Data by columns, array of {featureName:, featureValues:[], labels: []}
var dataByColumns = _.map(FEATURES, function(feature) {
  var valuesAndLabels = _.chain(tree_training_set)
      .map(function(datum) {
        return [datum[feature], datum['target']];
      })
      .shuffle()
      .unzip()
      .value();
  return {
    featureName: feature,
    featureValues: valuesAndLabels[0],
    labels: valuesAndLabels[1]
  };
});

// assign all features to master first
var allOnMaster =  _.chain(FEATURES.length)
    .range()
    .map(function(i) {
      return {
        node: 0,
        index: i
      };
    })
    .value();

// all features on master node
update(dataByColumns, allOnMaster);

// divide up the features amongst the workers
function partitionToWorkers() {
  // now randomly partition the features across the workers
  var partitionedToWorkers = _.chain(FEATURES.length)
    .range()
    .map(function(i) {
      return {
        node: Math.floor(i % K) + 1,
        index: Math.floor(i / K)
      };
    })
    .shuffle()
    .value();

  update(dataByColumns, partitionedToWorkers);
}

setTimeout(function () {
  // partitionToWorkers();
  // now sort each column by value, and update the labels
  _.forEach(dataByColumns, function(feature) {
    var valueAndLabel = _.zip(feature.featureValues, feature.labels);
    valueAndLabel = _.unzip(_.sortBy(valueAndLabel, function(val) { return parseFloat(val[0]); }));
    feature.featureValues = valueAndLabel[0];
    feature.labels = valueAndLabel[1];
  });
  console.log('sorted!');
  update(dataByColumns, allOnMaster);
}, 2000);

// setTimeout(partitionToWorkers, 4000);

