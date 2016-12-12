function checkScroll() {
  actualScrollTop = $window.scrollTop();

  if (actualScrollTop != scrollTop) {
    newScrollTop = ZENO(scrollTop, actualScrollTop);

    Dispatcher.trigger('scroll', newScrollTop);
    scrollTop = newScrollTop;
  }
}

var LANG = $('html').attr('lang');
LANG = (typeof LANG !== 'undefined') ? LANG : 'en';

var DIMENSIONS = [
  { 'id': 'elevation' },
  { 'id': 'year_built' },
  { 'id': 'bath' },
  { 'id': 'beds' },
  { 'id': 'price' },
  { 'id': 'sqft' },
  { 'id': 'price_per_sqft' }
]

var DIMENSION_LONGFORM = {
  elevation: {
    'en': 'elevation',
    'ru': 'возвышение',
    'zh': '海拔',
    'fr': 'altitude'
  },
  year_built: {
    'en': 'year built',
    'ru': 'год постройки',
    'zh': '建成年份',
    'fr': 'construction'
  },
  bath: {
    'en': 'bathrooms',
    'ru': 'кол-во ванных',
    'zh': '浴室',
    'fr': 'bains'
  },
  beds: {
    'en': 'bedrooms',
    'ru': 'кол-во спален',
    'zh': '臥室',
    'fr': 'pièces'
  },
  price: {
    'en': 'price',
    'ru': 'стоимость',
    'zh': '價格',
    'fr': 'prix'
  },
  sqft: {
    'en': 'square feet',
    'ru': 'площадь',
    'zh': '海拔',
    'fr': 'mètres'
  },
  price_per_sqft: {
    'en': 'price per sqft',
    'ru': 'цена за m²',
    'zh': '每平方公尺價格',
    'fr': 'prix par mètre'
  }
}

_.each(DIMENSIONS, function(D) {
  D.min = _.min(tree_training_set, function(d) {
    return d[D.id];
  })[D.id];

  D.max = _.max(tree_training_set, function(d) {
    return d[D.id];
  })[D.id];
});

var shuffled_training_set  = _.shuffle(tree_training_set);

var ZENO = function(current, actual) {
  var remainder = (current - actual) * 0.85;
  if (Math.abs(remainder) < 0.05) {
    return actual;
  } else {
    return remainder + actual;
  }
}

var isTargetFn = function(d) { return d['target'] > 0.5; }

var BinContinuousDataByPredicate = function(args) {
  /*
  data: the data array
  key: the column we care about
  predicate: which is the target
  bins: number of bins
  */

  var min = _.min(args.data, function(d) { return d[args.key]; })[args.key];
  var max = _.max(args.data, function(d) { return d[args.key]; })[args.key];
  var range = max - min;

  var partition = _.partition(args.data, args.predicate);

  var isTargets = partition[0];
  var isTargetsGrouped = _.groupBy(isTargets, function(d) {
    return Math.floor((d[args.key]-min)/range * (args.bins-1))
  });


  var isNotTargets = partition[1];
  var isNotTargetsGrouped = _.groupBy(isNotTargets, function(d) {
    return Math.floor((d[args.key]-min)/range * (args.bins-1))
  });

  var maxPerBin = 0;
  var binnedData = _.map(_.range(args.bins), function(d) {
    var isTargetCount = 0;
    if (isTargetsGrouped[d]) { isTargetCount = isTargetsGrouped[d].length; }
    if (isTargetCount > maxPerBin) { maxPerBin = isTargetCount; }

    var isNotTargetCount = 0;
    if (isNotTargetsGrouped[d]) { isNotTargetCount = isNotTargetsGrouped[d].length; }
    if (isNotTargetCount > maxPerBin) { maxPerBin = isNotTargetCount; }

    return {
      'isTarget' : isTargetCount,
      'isNotTarget' : isNotTargetCount
    }
  });

  return {
    bins: binnedData,
    max: maxPerBin
  }
}

var ParseGeometryFromTreeData = function(tree_data) {
  var tree = d3.layout.tree().separation(function(a, b) {
    return a.parent == b.parent ? 1 : 1;
  });
  var nodes = tree.nodes(tree_data);
  _.each(nodes, function(n) {
    n.samples = parseInt(n.samples);
  });
  var links = tree.links(nodes);

  return {
    nodes : nodes,
    links : links
  }
}

var CompileDataForNode = function(data_table, tree_stats, nodeID) {
  var dataIDs = [];

  if (tree_stats[nodeID].data_rows) {
    if (tree_stats[nodeID].data_rows.true) {
      dataIDs = dataIDs.concat(tree_stats[nodeID].data_rows.true);
    }
    if (tree_stats[nodeID].data_rows.false) {
      dataIDs = dataIDs.concat(tree_stats[nodeID].data_rows.false);
    }
  }

  var data = _.map(dataIDs, function(id) {
    return _.find(data_table, function(d) {
      return d.index == id
    });
  });

  return data;
}

var CompileMixForNode = function(data_table, tree_stats, nodeID) {
  var dataIDs = [];

  var countTrue = 0;
  var countFalse = 0;

  if (tree_stats[nodeID].data_rows) {
    if (tree_stats[nodeID].data_rows.true) {
      countTrue = tree_stats[nodeID].data_rows.true.length;
    }

    if (tree_stats[nodeID].data_rows.false) {
      countFalse = tree_stats[nodeID].data_rows.false.length;
    }

    var total = countTrue + countFalse;
    var classification = 'isTarget';
    if (countFalse > countTrue) {
      classification = 'isNotTarget';
    }

    return {
      true: countTrue / total,
      false: countFalse / total,
      classification: classification
    }
  } else {
    return {
      true: 0,
      false: 0,
      classification: null
    }
  }
}

_.each(tree_stats, function(node) {
  node.data = CompileDataForNode(shuffled_training_set, tree_stats, node.node);
  node.mix = CompileMixForNode(shuffled_training_set, tree_stats, node.node);
});

var TreePieView = Backbone.View.extend({
  initialize: function(args) {
    // Data Prep
    this.data = args.data;
    this.current = this.data;
    this.key = args.key;
    this.total_data_count = args.total_data_count

    // Geometry Prep
    this.g = args.g;
    this.maxRadius = 50;

    this.computeGeometry();

    this.pie = d3.layout.pie()
      .sort(null)
      .value(function(d) { return d.count; });

    this.slices = this.g.selectAll('.arc')
      .data(this.pie(this.data.parts))
    .enter().append('g')
      .attr('class', 'arc');

    this.slices.each(function(d) {
      d3.select(this).append('path');
    });

    this.rr = true;
    R2D3Views.push(this);
  },
  computeGeometry: function() {
    this.maxArea = this.maxRadius * this.maxRadius * Math.PI;
    this.area = this.maxArea / this.total_data_count * parseInt(this.data.total);
    var newRadius = Math.sqrt(this.area/Math.PI);

    if (this.radius != newRadius) {
      this.radius = newRadius;
      this.arc = d3.svg.arc()
        .outerRadius(this.radius)
        .innerRadius(0);
      return true;
    } else {
      return false;
    }
  },
  handleResize: function(args) {
    if (this.maxRadius != args.maxRadius) {
      this.maxRadius = args.maxRadius;
      this.computeGeometry();
      this.rr = true;
    }
  },
  render: function() {
    var v = this;

    this.slices.each(function(d) {
      d3.select(this).select('path')
        .attr('d', v.arc)
        .style('fill', function(d) { return FILL_FN(d.data.key); });
    });
  }
});

var HousingAxisHistogram = Backbone.View.extend({
  initialize: function(args) {
    this.data = args.data;
    this.key = args.key;
    this.g = args.g;

    if (typeof args.split === 'number' && !isNaN(args.split)) {
      this.split = args.split;
    } else {
      this.split = null;
    }

    this.width = 100;
    this.height = 25;
    this.orientation = 'HORIZONTAL';

    this.barWidth = 2;
    this.barGap = 1;
    this.growth = 1;

    this.handleResize({
      width: this.width,
      height: this.height
    });

    this.cid = this.cid + 'HousingAxisHistogram'

    this.rr = true;
    R2D3Views.push(this);
  },
  handleResize: function(args) {
    _.extend(this, args);

    if (this.orientation == 'HORIZONTAL') {
      this.valueEdge = this.width;
      this.magnitudeEdge = this.height
    } else {
      this.valueEdge = this.height;
      this.magnitudeEdge = this.width
    }

    if (args.barWidth) { this.barWidth = args.barWidth; }
    if (args.barGap) { this.barGap = args.barGap; }

    this.sectionWidth = this.barWidth * 2 + this.barGap;
    this.binsCount = Math.floor(this.valueEdge/this.sectionWidth);
    this.binnedData = BinContinuousDataByPredicate({
      data: this.data,
      key: this.key,
      predicate: isTargetFn,
      bins: this.binsCount
    });

    if (this.fixedMagnitude) {
      this.max = this.fixedMagnitude;
    } else {
      this.max = this.binnedData.max;
    }

    this.binScale = d3.scale.linear()
      .domain([0, this.max])
      .range([0, this.magnitudeEdge * this.growth]);

    if (this.split) {
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
    if (this.growth != growth) {
      this.growth = growth;

      this.binScale = d3.scale.linear()
        .domain([0, this.max])
        .range([0, this.magnitudeEdge * this.growth]);

      this.rr = true;
    }
  },
  render: function() {
    var v = this;

    this.selection = d3.select(this.g).selectAll('.bin')
      .data(this.binnedData.bins)

    this.selection.exit().remove()

    this.selection
      .enter()
      .append('g')
        .attr('class', 'bin')

    this.selection
      .attr('transform', function(d, i) {
        if (v.orientation == 'HORIZONTAL') {
          return 'translate('+(i*v.sectionWidth)+',0)';
        } else {
          return 'translate(0,'+(i*v.sectionWidth)+')';
        }
      })
      .each(function(d) {
        d3.select(this).selectAll('rect').remove()

        d3.select(this)
          .append('rect')
            .attr('class', 'isTarget')
            .attr('width', function(d) {
              if (v.orientation == 'HORIZONTAL') {
                return v.barWidth;
              } else {
                return v.binScale(d.isTarget);
              }
            })
            .attr('height', function(d) {
              if (v.orientation != 'HORIZONTAL') {
                return v.barWidth;
              } else {
                return v.binScale(d.isTarget);
              }
            })
            .attr('y', function(d) {
              if (v.orientation == 'HORIZONTAL') {
                return v.magnitudeEdge - v.binScale(d.isTarget);
              } else {
                return 0
              }
            })
            .attr('x', function(d) {
              if (v.orientation != 'HORIZONTAL') {
                return v.magnitudeEdge - v.binScale(d.isTarget);
              } else {
                return 0
              }
            })
            .attr('fill', FILL_FN('isTarget'))

        d3.select(this)
          .append('rect')
            .attr('class', 'isNotTarget')
            .attr('width', function(d) {
              if (v.orientation == 'HORIZONTAL') {
                return v.barWidth;
              } else {
                return v.binScale(d.isNotTarget);
              }
            })
            .attr('height', function(d) {
              if (v.orientation != 'HORIZONTAL') {
                return v.barWidth;
              } else {
                return v.binScale(d.isNotTarget);
              }
            })
            .attr('y', function(d) {
              if (v.orientation == 'HORIZONTAL') {
                return v.magnitudeEdge - v.binScale(d.isNotTarget);
              } else {
                return v.barWidth
              }
            })
            .attr('x', function(d) {
              if (v.orientation != 'HORIZONTAL') {
                return v.magnitudeEdge - v.binScale(d.isNotTarget);
              } else {
                return v.barWidth
              }
            })
            .attr('fill', FILL_FN('isNotTarget'))
      });

    if (this.split_location) {
      this.split_path = d3.select(this.g).select('.split_path');

      if (this.split_path.empty()) {
        this.split_path = d3.select(this.g).append('path')
          .attr('fill', '#888888')
          .classed('split_path', true);
      }

      var x = this.split_location;
      var y = this.magnitudeEdge + 5;

      var path = '';
      path += 'M ' + x + ' ' + y + ' ';
      path += 'L ' + (x + 4) + ' ' + (y + 4) + ' ';
      path += 'L ' + (x - 4) + ' ' + (y + 4) + ' ';
      path += 'Z';

      this.split_path.attr('d', path);
    }

    return this;
  }
});

var TreeNodeView = Backbone.View.extend({
  initialize: function(args) {
    this.cid = this.cid + 'TreeNodeView';

    var v = this;

    this.g = args.g;
    this.node = args.node;
    this.stats = args.stats;
    this.fixedMagnitude = args.fixedMagnitude;
    this.depth = args.depth;
    this.maxDepth = args.maxDepth;
    this.links = args.links;

    this.histogram = d3.select(this.g)
      .append('g')
      .attr('class', 'tree-histogram');

    this.histogram
      .each(function() {
        this.view = new HousingAxisHistogram({
          g: this,
          data: v.stats.data,
          key: v.stats.attribute,
          split: parseFloat(v.stats.split_point)
        });

        this.view.fixedMagnitude = v.fixedMagnitude;
      });

    // Pie Chart
    this.pieChartLayer = d3.select(this.g)
      .append('g')
      .attr('class', 'tree-pie')
      .attr('opacity', 0);

    var path = this.pieChartLayer.append('path')
      .attr('fill', 'none')

    if (!args.links) {
      path
      .attr('stroke-dasharray', '6,5')
      .attr('stroke', '#888888');
    } else {
      path
      .attr('stroke', '#000000');
    }

    this.pieChart = new TreePieView({
      g: this.pieChartLayer,
      data: {
        total: this.stats.data.length,
        parts: [
          { key: 'isTarget', count: this.stats.data_rows['true'].length },
          { key: 'isNotTarget', count: this.stats.data_rows['false'].length }
        ]
      },
      key: v.stats.attribute,
      total_data_count: shuffled_training_set.length
    });

    this.verticalOffsetThreshold = function(scroll) { return 0; }
    this.verticalOffset = 0;

    this.label = d3.select(this.g)
      .append('text')
      .attr('font-size', 12)
      .attr('font-weight', 600)
      .attr('fill', '#555555')
      .attr('text-anchor', 'middle');

    this.listenTo(Dispatcher, 'scroll', this.handleScroll);
    this.rr = true;
    R2D3Views.push(this);
  },
  handleResize: function(args) {
    var v = this;

    this.width = args.width;
    this.height = args.height;

    this.start = args.start;
    this.end = args.end;

    var windowHeight = $window.height();

    this.histogram.each(function() {
      this.view.handleResize({
        width: v.width,
        height: v.height,
        barWidth: 2,
        barGap: 1
      });
    });

    var domain = [
      0 + 45,
      0 + 45, // both off
      2 + 45 + this.depth*5, // pie on
      6 + 45 + this.depth*5, // pie off, histogram on
      7 + 45 + this.depth*5,
      11 + 45 + this.depth*5, // histogram faded
    ]

    // Histogram Threshold
    this.histogramOpacityThreshold = d3.scale.threshold()
      .domain(domain)
      .range([0,0,0,0,1,1,0.3]);

    // Pie Thresholds
    var pieFading = 0;
    var pieCenterOffset = windowHeight * 0.4 / this.maxDepth;

    if (!this.links) {
      pieFading = 1;

      var distanceToGo = (this.maxDepth - this.depth) * (windowHeight * 0.45) / this.maxDepth;

      this.verticalOffsetThreshold = d3.scale.linear()
        .domain([this.depth*5 + 45, 85])
        .range([pieCenterOffset,distanceToGo + pieCenterOffset]);
    } else {
      this.verticalOffsetThreshold = function(scroll) {
        return pieCenterOffset;
      }
    }

    this.pieOpacityThreshold = d3.scale.threshold()
      .domain(domain)
      .range([0,0,0,1,pieFading,pieFading,pieFading]);

    this.pieChart.handleResize({
      maxRadius: this.height
    });

    this.label
      .attr('y', v.height + 24);

    this.rr = true;
  },
  handleScroll: function(scroll) {
    var newHistogramOpacity = this.histogramOpacityThreshold(scroll);
    var newPieOpacity = this.pieOpacityThreshold(scroll);
    var newVerticalOffset = this.verticalOffsetThreshold(scroll);
    if (this.histogramOpacity != newHistogramOpacity ||
        this.verticalOffset != newVerticalOffset ||
        this.pieOpacity != newPieOpacity) {
      this.histogramOpacity = newHistogramOpacity;
      this.pieOpacity = newPieOpacity;
      this.verticalOffset = newVerticalOffset;
      this.rr = true;
    }
  },
  render: function() {
    var v = this;

    this.histogram
      .attr('transform', 'translate('+(-this.width/2)+',0)')
      .attr('opacity', this.histogramOpacity);

    this.pieChartLayer
      .attr('opacity', this.pieOpacity)
      .attr('transform', 'translate(0,'+this.verticalOffset+')');


    var path = this.pieChartLayer.select('path');
    if (this.depth == 0) {
      // never show branch for very first pie chart
      path.attr('opacity', 0);
    } else {
      path.attr('opacity', this.pieOpacity);
    }
    path.attr('d', function() {
      var x1 = 0;
      var y1 = 0;
      var x2 = 0;
      var y2 = -v.verticalOffset;

      var d = 'M ' + x1 + ' ' + y1 + ' ';
      d += 'L ' + x2 + ' ' + y2 + ' ';

      return d;
    });

    if (this.stats.attribute) {
      this.label
        .text(DIMENSION_LONGFORM[this.stats.attribute][LANG])
        .attr('opacity', this.histogramOpacity);
    }


    if (this.links) {
      d3.selectAll(this.links)
        .attr('opacity', this.histogramOpacity);
    }
  }
});

var DecisionTreeView = Backbone.View.extend({
  initialize: function(args) {
    this.cid = this.cid + 'DecisionTreeView';

    var v = this;

    // Geometry Prep
    this.data = args.data;
    this.tree = ParseGeometryFromTreeData(this.data.tree);
    this.stats = this.data.stats;

    this.maxDepth = _.max(this.tree.nodes, function(d) {
      return d.depth;
    })['depth'];

    this.verticalPadding = 30;

    // DOM prep
    this.$section = $(this.el).parent();

    this.svg = d3.select(this.el).append('svg');
    this.links_layer = this.svg.append('g')
      .attr('class', 'links_layer')
      .attr('transform', 'translate(0, '+this.verticalPadding+')');

    var nodeLinks = {};

    this.links = this.links_layer.selectAll('.tree-link')
      .data(this.tree.links)
      .enter()
        .append('path')
        .attr('class', 'tree-link')
        .attr('stroke', '#000000')
        .attr('fill', 'none')
        .each(function(d) {
          if (!nodeLinks[d.source.id]) {
            nodeLinks[d.source.id] = [this];
          } else {
            nodeLinks[d.source.id].push(this);
          }
        });

    this.nodes_layer = this.svg.append('g')
      .attr('class', 'nodes_layer')
      .attr('transform', 'translate(0, '+this.verticalPadding+')');

    this.nodes = this.nodes_layer.selectAll('.node')
      .data(this.tree.nodes)
      .enter()
        .append('g')
        .attr('class', 'node')
        .each(function(d) {
          if (!v.stats[d.id]) { return; }
          this.view = new TreeNodeView({
            g: this,
            node: d,
            depth: d.depth,
            stats: v.stats[d.id],
            maxDepth: v.maxDepth,
            fixedMagnitude: v.data.stats[0].data.length/8,
            links: nodeLinks[d.id]
          });
        });

    this.handleResize();
    this.listenTo(Dispatcher, 'resize', this.handleResize);

    this.rr = true;
    R2D3Views.push(this);
  },
  handleResize: function(args) {
    var v = this;

    var windowHeight = $window.height();
    var windowWidth = $window.width();

    this.height = Math.min(windowHeight * 0.7 * 0.95, 700 * 0.95);
    this.width = Math.min(windowWidth * 0.9, 960 * 0.90);

    this.innerHeight = this.height - windowHeight * 0.15;

    this.layerHeight = this.innerHeight/8;
    this.graphHeight = this.layerHeight * 0.7;
    this.graphGap = this.layerHeight - this.graphHeight;

    // Scales
    this.x_scale = d3.scale.linear()
      .domain([0,1])
      .range([0, this.width]);

    this.y_scale = d3.scale.linear()
      .domain([0,1])
      .range([0, this.innerHeight]);

    // Scroll Domains
    var sectionOffsetTop = this.$section.offset().top;
    var sectionHeight = this.$section.height();

    var start = sectionOffsetTop;
    var end = sectionOffsetTop + sectionHeight;

    this.nodes.each(function(d) {
      if (!this.view) { return; }
      this.view.handleResize({
        width: (4 + Math.floor(d.samples/2)),
        height: v.graphHeight,
        start: start,
        end: end
      });
    });

    this.rr = true;
  },
  render: function() {
    var v = this;

    this.svg
      .attr('width', this.width)
      .attr('height', this.height)
      .style('padding', '25px 0');

    this.nodes.each(function(d) {
      d3.select(this).attr('transform', function() {

        var x = v.x_scale(d.x);
        var y = v.y_scale(d.y);

        return 'translate('+x+','+y+')';
      });
    });

    this.links.each(function(link) {
      d3.select(this).attr('d', function() {
        var x1 = v.x_scale(link.source.x);
        var y1 = v.y_scale(link.source.y);
        var x2 = v.x_scale(link.target.x);
        var y2 = v.y_scale(link.target.y);

        var lineTop = v.graphHeight + y1 + 3;

        var d = 'M ' + x1 + ' ' + lineTop + ' ';
        d += 'L ' + x2 + ' ' + lineTop + ' ';
        d += 'L ' + x2 + ' ' + y2 + ' ';

        return d;
      });
    });
  },

  handleScroll: function(scroll) {
    this.nodes.each(function() {
      this.view.handleScroll(scroll);
    })
  },
});

