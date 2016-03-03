var Dispatcher = _.clone(Backbone.Events);

$window = $(window);
$window.on("resize", _.debounce(function() {
  Dispatcher.trigger("resize");
}, 700));

var R2D3Views = [];
var fps = 15;
var scrollTop = 0, actualScrollTop = 0;

function checkScroll() {
  actualScrollTop = $window.scrollTop();

  if(actualScrollTop != scrollTop) {
    newScrollTop = ZENO(scrollTop, actualScrollTop);

    Dispatcher.trigger("scroll", newScrollTop);
    scrollTop = newScrollTop;
  }
}

function draw() {
  requestAnimationFrame(draw);

  // Drawing code goes here
  _.each(R2D3Views, function(v, i) {
    if(!v.rr) { return; }
    v.rr = false;
    v.render(); // Let the view have the last word about re-rendering next frame.
  });

  if(actualScrollTop != scrollTop) {
    newScrollTop = ZENO(scrollTop, actualScrollTop);
    Dispatcher.trigger("scroll", newScrollTop);
    scrollTop = newScrollTop;
  }
}

var LANG = $('html').attr('lang');
LANG = (typeof LANG !== 'undefined') ? LANG : 'en';

var DIMENSIONS = [
  { "id": "elevation" },
  { "id": "year_built" },
  { "id": "bath" },
  { "id": "beds" },
  { "id": "price" },
  { "id": "sqft" },
  { "id": "price_per_sqft" }
]

var DIMENSION_LONGFORM = {
  elevation: {
    "en": "elevation",
    "ru": "возвышение",
    "zh": "海拔",
    "fr": "altitude"
  },
  year_built: {
    "en": "year built",
    "ru": "год постройки",
    "zh": "建成年份",
    "fr": "construction"
  },
  bath: {
    "en": "bathrooms",
    "ru": "кол-во ванных",
    "zh": "浴室",
    "fr": "bains"
  },
  beds: {
    "en": "bedrooms",
    "ru": "кол-во спален",
    "zh": "臥室",
    "fr": "pièces"
  },
  price: {
    "en": "price",
    "ru": "стоимость",
    "zh": "價格",
    "fr": "prix"
  },
  sqft: {
    "en": "square feet",
    "ru": "площадь",
    "zh": "海拔",
    "fr": "mètres"
  },
  price_per_sqft: {
    "en": "price per sqft",
    "ru": "цена за m²",
    "zh": "每平方公尺價格",
    "fr": "prix par mètre"
  }
}

var testAccuracyText = function(LANG) {
  switch (LANG) {
    case 'ru':
      return 'точность результатов на тестовой выборке'
    case 'fr':
      return 'précision sur les données de test'
    case 'en':
    default:
      return 'Test Accuracy';
  }
}

var trainingAccuracyText = function(LANG) {
  switch (LANG) {
    case 'ru':
      return 'точность результатов на обучающей выборке'
    case 'fr':
      return 'précision sur les données d’apprentissage'
    case 'en':
    default:
      return 'Training Accuracy';
  }
}

var DIMENSION_UNITS = {
  elevation: {
    prefix: "",
    suffix: "m"
  },
  year_built: {
    prefix: "",
    suffix: ""
  },
  bath: {
    prefix: "",
    suffix: "baths"
  },
  beds: {
    prefix: "",
    suffix: "bedrooms"
  },
  price: {
    prefix: "$",
    suffix: ""
  },
  sqft: {
    prefix: "",
    suffix: "sqft"
  },
  price_per_sqft: {
    prefix: "$",
    suffix: "per sqft"
  }
}

var UNIT_CONVERSION = function(value, unit, lang) {

  var IMPERIAL_UNITS = ['en'];
  var value = parseFloat(value);

  if (IMPERIAL_UNITS.indexOf(lang) < 0) {
    switch (unit) {
      case 'ft':
        var output_value = value * 0.3048;
        var output_unit = 'm';
        break;

      case 'sqft':
        var output_value = value * 0.092903;
        var output_unit = 'm²';
        break;

      case 'per sqft':
        var output_value = value * 10.7639;
        var output_unit = 'per m²';
        break;

      default:
        var output_value = value;
        var output_unit = unit;
    }
  } else {
    switch (unit) {
      case 'm':
        var output_value = value * 3.28084;
        var output_unit = 'ft';
        break;

      case 'm²':
        var output_value = value * 10.7639;
        var output_unit = 'sqft'
        break;

      case 'per m²':
        var output_value = value * 0.092903;
        var output_unit = 'per sqft'
        break;


      default:
        var output_value = value;
        var output_unit = unit;
    }
  }

  switch (lang) {
    case 'ru':
      if (output_unit === 'per m²') { output_unit = 'за m²'; }
      break;

    case 'fr':
      if (output_unit === 'par m²') { output_unit = 'за m²'; }
      break;
  }

  return output_value.toFixed(1) + ' ' + output_unit;
}

_.each(DIMENSIONS, function(D) {
  D.min = _.min(tree_training_set, function(d) {
    return d[D.id];
  })[D.id];

  D.max = _.max(tree_training_set, function(d) {
    return d[D.id];
  })[D.id];
});

tree_training_set = _.shuffle(tree_training_set);

var FILL_FN = function(d, o) {
  // https://color.adobe.com/tree-color-theme-5926460/
  if (!o) {
    o = 1;
  }

  if((typeof d == "object" && d['target'] > 0.5) || d === "isTarget" || (typeof d == "boolean" && d)) {
    // return "rgba(130,140,53," + o + ")"; // SF
    // return "rgba(242,85,44," + o + ")"; // Giants Orange
    // return "rgba(253,185,39," + o + ")"; // Warriors Gold
    // return "rgba(211,144,36," + o + ")"; // Warriors Gold, slightly darkened
    // return "rgba(215,126,39," + o + ")"; // Another Orange
    // return "rgba(215,126,39," + o + ")"; // Another Orange
    return "rgba(65,153,43," + o + ")"; // Another Green
  } else {
    // return "rgba(69,110,191," + o + ")"; // NYC
    // return "rgba(38,82,126," + o + ")"; // Yankee Blue
    // return "rgba(0,107,182," + o + ")"; // Knicks Blue
    return "rgba(16,70,131," + o + ")"; // Another Blue
  }
}

var ZENO = function(current, actual) {
  var remainder = (current - actual) * 0.85;
  if(Math.abs(remainder) < 0.05) {
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
    if(isTargetsGrouped[d]) { isTargetCount = isTargetsGrouped[d].length; }
    if(isTargetCount > maxPerBin) { maxPerBin = isTargetCount; }

    var isNotTargetCount = 0;
    if(isNotTargetsGrouped[d]) { isNotTargetCount = isNotTargetsGrouped[d].length; }
    if(isNotTargetCount > maxPerBin) { maxPerBin = isNotTargetCount; }

    return {
      "isTarget" : isTargetCount,
      "isNotTarget" : isNotTargetCount
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

var ParseLineageFromTreeData = function(tree_data) {
  var tree = d3.layout.tree();
  var nodes = tree.nodes(tree_data);
  var results = [];
  _.each(nodes, function(n) {
    var node = {
      id: parseInt(n.id),
    }

    if (n.children) {
      node.left = parseInt(n.children[0].id);
      node.right = parseInt(n.children[1].id);
    }

    results[parseInt(n.id)] = node;
  });

  return results;
}

var CompileDataForNode = function(data_table, tree_stats, nodeID) {
  var dataIDs = [];

  if(tree_stats[nodeID].data_rows) {
    if(tree_stats[nodeID].data_rows.true) {
      dataIDs = dataIDs.concat(tree_stats[nodeID].data_rows.true);
    }
    if(tree_stats[nodeID].data_rows.false) {
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

  if(tree_stats[nodeID].data_rows) {
    if(tree_stats[nodeID].data_rows.true) {
      countTrue = tree_stats[nodeID].data_rows.true.length;
    }

    if(tree_stats[nodeID].data_rows.false) {
      countFalse = tree_stats[nodeID].data_rows.false.length;
    }

    var total = countTrue + countFalse;
    var classification = "isTarget";
    if (countFalse > countTrue) {
      classification = "isNotTarget";
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

var ComputeSplit = function(data, key, splitValue) {
  var split = _.partition(data, function(d) {
    return d[key] >= splitValue
  });

  var gt = _.partition(split[0], isTargetFn);
  var lte = _.partition(split[1], isTargetFn)

  return {
    key: key,
    splitValue: splitValue,
    gt: {
      all: split[0],
      isTarget: gt[0],
      isNotTarget: gt[1]
    },
    lte: {
      all: split[1],
      isTarget: lte[0],
      isNotTarget: lte[1]
    }
  }
}

_.each(tree_stats, function(node) {
  node.data = CompileDataForNode(tree_training_set, tree_stats, node.node);
  node.mix = CompileMixForNode(tree_training_set, tree_stats, node.node);
});

_.each(test_stats, function(node) {
  node.data = CompileDataForNode(tree_test_set, test_stats, node.node);
  node.mix = CompileMixForNode(tree_test_set, test_stats, node.node);
});


var ComputeTestTree = function(tree, test_set) {
  var test_tree = jQuery.extend(true, {}, tree);
  var test_stats = [];

  var partitionFork = function(tree, data, depth) {
    tree.samples = data.length;

    // Partition based on if data is Target
    var target = _.partition(data, function(d) {
      return d.target > 0.5;
    });

    // Partition based on if data is above or below split
    var split = _.partition(data, function(d) {
      return d[tree.key] > parseFloat(tree.value);
    });

    // Compute Gini for Given Node
    var isTargetLength = target[0].length/data.length;
    var isNotTargetLength = target[1].length/data.length;
    var gini = 1 - (isTargetLength*isTargetLength + isNotTargetLength*isNotTargetLength);

    tree.gini = gini;

    // Some additional Statistics about the data
    var hasChildren = (split[0].length > 0 && split[1].length >0);
    var max = _.max(data, function(d) {
      return d[tree.key];
    })[tree.key];
    var min = _.min(data, function(d) {
      return d[tree.key];
    })[tree.key];

    var stats = {
      data : data,
      data_rows : {
        true : _.pluck(target[0], "index"),
        false : _.pluck(target[1], "index")
      },
      has_children: hasChildren,
      node: tree.id
    }

    test_stats[parseInt(stats.node)] = stats;

    if(hasChildren) {
      stats.attribute = tree.key,
      stats.max_val = max;
      stats.min_val = min;
      stats.data_values = {
        true : _.pluck(target[0], tree.key),
        false : _.pluck(target[1], tree.key)
      }
      stats.split_location = {
        left_side: split[1],
        right_side: split[0]
      }
      stats.split_point = tree.value

      partitionFork(tree.children[0], split[1], depth+1);
      partitionFork(tree.children[1], split[0], depth+1);
    }

  }

  partitionFork(test_tree, test_set, 0);

  return {
    tree: test_tree,
    stats: test_stats
  }
}

var StickyDivView = Backbone.View.extend({
  initialize: function(args) {
    this.cssProperties = {};
    this.thresholds = d3.scale.threshold();

    this.topFn = args.topFn;
    this.bottomFn = args.bottomFn;

    this.rr = true;

    R2D3Views.push(this);
    this.handleResize();
    this.handleScroll(0);

    this.cid = this.cid + "StickyDivView";

    this.listenTo(Dispatcher, 'scroll', this.handleScroll);
    this.listenTo(Dispatcher, 'resize', this.handleResize);
  },
  handleResize: function() {
    this.topBound = this.topFn();
    this.bottomBound = this.bottomFn() - $window.height();

    this.thresholds
      .domain([
        this.topBound,
        this.bottomBound
      ])
      .range([
        {
          top: this.topBound + "px",
          position: "absolute"
        },
        {
          top: 0,
          position: "fixed"
        },
        {
          top: this.bottomBound + "px",
          position: "absolute"
        }
      ]);

    this.rr = true;
  },
  handleScroll: function(scroll) {
    // Compute Potential Changes
    // Look into using d3.scale.threshold for this: https://github.com/mbostock/d3/wiki/Quantitative-Scales#threshold
    var newCss = this.thresholds(scroll);

    // Is a render required?
    if(!_.isEqual(this.cssProperties, newCss)) {
      this.cssProperties = newCss;
      this.render();
    }
  },
  render: function() {
    this.$el.css(this.cssProperties);
  }
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

    this.slices = this.g.selectAll(".arc")
      .data(this.pie(this.data.parts))
    .enter().append("g")
      .attr("class", "arc");

    this.slices.each(function(d) {
      d3.select(this).append("path");
    });

    this.rr = true;
    R2D3Views.push(this);
  },
  computeGeometry: function() {
    this.maxArea = this.maxRadius * this.maxRadius * Math.PI;
    this.area = this.maxArea / this.total_data_count * parseInt(this.data.total);
    var newRadius = Math.sqrt(this.area/Math.PI);

    if(this.radius != newRadius) {
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
    if(this.maxRadius != args.maxRadius) {
      this.maxRadius = args.maxRadius;
      this.computeGeometry();
      this.rr = true;
    }
  },
  render: function() {
    var v = this;

    this.slices.each(function(d) {
      d3.select(this).select("path")
        .attr("d", v.arc)
        .style("fill", function(d) { return FILL_FN(d.data.key); });
    });
  }
});

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
})

var TreeNodeView = Backbone.View.extend({
  initialize: function(args) {
    this.cid = this.cid + "TreeNodeView";

    var v = this;

    this.g = args.g;
    this.node = args.node;
    this.stats = args.stats;
    this.fixedMagnitude = args.fixedMagnitude;
    this.depth = args.depth;
    this.maxDepth = args.maxDepth;
    this.links = args.links;

    this.histogram = d3.select(this.g)
      .append("g")
      .attr("class", "tree_histogram");

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
      .append("g")
      .attr("class", "tree_pie")
      .attr("opacity", 0);

    this.pieChartLayer.append("path")
      .attr("fill", "none")
      .attr("stroke", "#dddddd");

    this.pieChart = new TreePieView({
      g: this.pieChartLayer,
      data: {
        total: this.stats.data.length,
        parts: [
          { key: "isTarget", count: this.stats.data_rows['true'].length },
          { key: "isNotTarget", count: this.stats.data_rows['false'].length }
        ]
      },
      key: v.stats.attribute,
      total_data_count: tree_training_set.length
    });

    this.verticalOffsetThreshold = function(scroll) { return 0; }
    this.verticalOffset = 0;

    this.label = d3.select(this.g)
      .append("text")
      .attr("font-size", 10)
      .attr("fill", "#555555")
      .attr("text-anchor", "middle");

    this.listenTo(Dispatcher, "scroll", this.handleScroll);
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

    var pre = this.start - windowHeight * 1;
    var start = this.start - windowHeight * 0.5;

    if(this.depth === 0) {
      pre -= windowHeight * 1.1;
      start -= windowHeight * 1.1;
    }

    if(this.depth === 1) {
      pre -= windowHeight * 0.5;
      start -= windowHeight * 0.5;
    }

    var end = this.end - windowHeight * 1;
    var after = end + 1;
    var vunit = (end - start - windowHeight * 0.4) / (this.maxDepth + 1);
    var h1 = start + vunit * this.node.depth;
    var h2 = h1 + vunit;

    var domain = [
      pre,
      start, // both off
      h1, // pie on
      h2, // pie off, histogram on
      end,
      after
    ]
    var min = _.min(domain)
    var max = _.max(domain)
    domain = _.map(domain, function(num){ return num / (max - min) * 100 + 100; });

    console.log(domain);

    // Histogram Threshold
    this.histogramOpacityThreshold = d3.scale.threshold()
      .domain(domain)
      .range([0,0,0,0,1,1,0.3]);

    // Pie Thresholds
    var pieFading = 0;
    var pieCenterOffset = windowHeight * 0.4 / this.maxDepth;

    if(!this.links) {
      pieFading = 1;

      var distanceToGo = (this.maxDepth - this.depth) * (windowHeight * 0.45) / this.maxDepth;

      this.verticalOffsetThreshold = d3.scale.linear()
        .domain([h1, end])
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
      .attr('y', v.height + 22);

    this.rr = true;
  },
  handleScroll: function(scroll) {
    var newHistogramOpacity = this.histogramOpacityThreshold(scroll);
    var newPieOpacity = this.pieOpacityThreshold(scroll);
    var newVerticalOffset = this.verticalOffsetThreshold(scroll);
    if(this.histogramOpacity != newHistogramOpacity ||
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
      .attr("transform", "translate("+(-this.width/2)+",0)")
      .attr("opacity", this.histogramOpacity);

    this.pieChartLayer
      .attr("opacity", this.pieOpacity)
      .attr("transform", "translate(0,"+this.verticalOffset+")");

    this.pieChartLayer.select("path")
      .attr("opacity", this.histogramOpacity)
      .attr("d", function() {
        var x1 = 0;
        var y1 = 0;
        var x2 = 0;
        var y2 = -v.verticalOffset;

        var d = "M " + x1 + " " + y1 + " ";
        d += "L " + x2 + " " + y2 + " ";

        return d;
      });

    if (this.stats.attribute) {
      this.label
        .text(DIMENSION_LONGFORM[this.stats.attribute][LANG])
        .attr("opacity", this.histogramOpacity);
    }


    if(this.links) {
      d3.selectAll(this.links)
        .attr("opacity", this.histogramOpacity);
    }
  }
});


var DecisionTreeView = Backbone.View.extend({
  initialize: function(args) {
    this.cid = this.cid + "DecisionTreeView";

    var v = this;

    // Geometry Prep
    this.data = args.data;
    this.tree = ParseGeometryFromTreeData(this.data.tree);
    this.stats = this.data.stats;

    this.maxDepth = _.max(this.tree.nodes, function(d) {
      return d.depth;
    })["depth"];

    this.verticalPadding = 30;

    // DOM prep
    this.$section = $("#tree");

    this.svg = d3.select(this.el).append("svg");
    this.links_layer = this.svg.append("g")
      .attr("class", "links_layer")
      .attr("transform", "translate(0, "+this.verticalPadding+")");

    var nodeLinks = {};

    this.links = this.links_layer.selectAll(".tree_link")
      .data(this.tree.links)
      .enter()
        .append("path")
        .attr("class", "tree_link")
        .attr("stroke", "#000000")
        .attr("fill", "none")
        .each(function(d) {
          if(!nodeLinks[d.source.id]) {
            nodeLinks[d.source.id] = [this];
          } else {
            nodeLinks[d.source.id].push(this);
          }
        });

    this.nodes_layer = this.svg.append("g")
      .attr("class", "nodes_layer")
      .attr("transform", "translate(0, "+this.verticalPadding+")");

    this.nodes = this.nodes_layer.selectAll(".node")
      .data(this.tree.nodes)
      .enter()
        .append("g")
        .attr("class", "node")
        .each(function(d) {
          if(!v.stats[d.id]) { return; }
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

    this.width = this.$el.parent().width() * 0.8;
    this.height = windowHeight * 0.8;

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
      if(!this.view) { return; }
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
      .attr("width", this.width)
      .attr("height", this.height);

    this.nodes.each(function(d) {
      d3.select(this).attr("transform", function() {

        var x = v.x_scale(d.x);
        var y = v.y_scale(d.y);

        return "translate("+x+","+y+")";
      });
    });

    this.links.each(function(link) {
      d3.select(this).attr("d", function() {
        var x1 = v.x_scale(link.source.x);
        var y1 = v.y_scale(link.source.y);
        var x2 = v.x_scale(link.target.x);
        var y2 = v.y_scale(link.target.y);

        var lineTop = v.graphHeight + y1 + 3;

        var d = "M " + x1 + " " + lineTop + " ";
        d += "L " + x2 + " " + lineTop + " ";
        d += "L " + x2 + " " + y2 + " ";

        return d;
      });
    });
  },
  handleScroll: function(scroll) {
    this.nodes.each(function() {
      this.view.handleScroll(scroll);
    })
  },
})

var AnimatedClassifierView = Backbone.View.extend({
  setUpAbstractGeometry: function(data, stats, groupID) {
    var v = this;

    var index = [];
    var samples = _.map(data, function(sample) {
      var path = this.pathGroup.append('path');

      path
        .attr('stroke-width', 1)
        .attr('stroke', FILL_FN(sample))
        .attr('fill', 'none')
        .attr('opacity', 0);

      var circle = this.circleGroup.append('circle');

      circle
        .on('mouseenter', function() {
          v.sampleID = sample.index;
          v.rr = true;
        })
        .on('mouseleave', function() {
          v.sampleID = null;
          v.rr = true;
        })
        .attr('fill', FILL_FN(sample))
        .attr('stroke-width', 1)
        .attr('stroke', FILL_FN(sample))
        .attr('r', this.ballRadius);

      index.push(sample.index);

      return {
        groupID: groupID,
        attributes: sample,
        waypoints: [],
        treeCoordinates: [],
        path: path,
        circle: circle,
        x: 0,
        y: 0
      }
    }, this);

    _.each(stats, function(node) {
      _.each(node.data, function(sampleInNode) {
        var trainingKey = index.indexOf(sampleInNode.index);

        if (trainingKey >= 0) {
          var coordinates = {
            x: this.tree.nodes[parseInt(node.node)].x,
            y: this.tree.nodes[parseInt(node.node)].y
          }

          samples[trainingKey].waypoints.push(node.node);
          samples[trainingKey].treeCoordinates.push(coordinates);
        }
      }, this);
    }, this);

    _.each(samples, function(s) {
      var lastNode = parseInt(s.waypoints[s.waypoints.length-1]);
      var classification = this.training_stats[lastNode].mix.classification;

      s.classification = classification;

      if (s.attributes.target > 0.5) {
        s.correctlyClassified = (s.classification === "isTarget");
      } else {
        s.correctlyClassified = (s.classification === "isNotTarget");
      }

      if (!s.correctlyClassified) {
        s.circle.attr('fill', 'none');
      }
    }, this);

    samples = _.shuffle(samples);

    var setSize = samples.length;
    var classifiedSamples = _.partition(samples, function(s) {
      return s.classification == "isTarget"
    });

    // Placing Things into the right piles
    var asTargetSize = classifiedSamples[0].length;
    var asNotTargetSize = classifiedSamples[1].length;

    var numberOfRows = 5;

    var asTargetCorrect = 0;
    var asTargetIncorrect = 0;
    _.each(classifiedSamples[0], function(s) {
      var numberOfColumns = Math.ceil(asTargetSize / numberOfRows);

      var order = asTargetCorrect;
      if (s.correctlyClassified) {
        asTargetCorrect++;
      } else {
        order = asTargetSize - asTargetIncorrect - 1;
        asTargetIncorrect++;
      }

      var column = order % numberOfRows;
      var row = Math.floor(order / numberOfRows);

      s.pileCoordinates = {
        row: row,
        col: column
      }
    });

    var asNotTargetCorrect = 0;
    var asNotTargetIncorrect = 0;
    _.each(classifiedSamples[1], function(s) {
      var numberOfColumns = Math.ceil(asNotTargetSize / numberOfRows);

      var order = asNotTargetCorrect;
      if (s.correctlyClassified) {
        asNotTargetCorrect++;
      } else {
        order = asNotTargetSize - asNotTargetIncorrect - 1;
        asNotTargetIncorrect++;
      }

      var column = order % numberOfRows;
      var row = Math.floor(order / numberOfRows);

      s.pileCoordinates = {
        row: row,
        col: column
      }
    });

    return samples;
  },
  initialize: function(args) {
    var v = this;

    _.extend(this, args);

    this.paddingRight = 20;
    this.ballRadius = 3;
    this.ballSpacing = this.ballRadius + 5;
    this.labelOffset = 30;

    this.svg = this.el.append('svg');

    this.pathGroup = this.svg.append('g');
    this.circleGroup = this.svg.append('g');
    this.labelsGroup = this.svg.append('g');
    this.hoverGroup = this.svg.append('g');
    this.resultsGroup = this.svg.append('g');

    this.resultsView = new ClassifierResultsView({
      g: v.resultsGroup
    });

    this.trainingSection = $('#classify-training-data');
    this.testSection = $('#classify-test-data');

    this.trainingSamples = [];
    this.testSamples = [];
    this.splitLabels = [];
    this.sampleIndex = [];

    this.tree = ParseGeometryFromTreeData(this.treeData);

    this.trainingSamples = this.setUpAbstractGeometry(this.training, this.training_stats, 'train');
    this.testSamples = this.setUpAbstractGeometry(this.test, this.test_stats, 'test');

    _.each(this.tree.nodes, function(node) {
      var labelLayer = this.labelsGroup.append('g');

      var overlayLayer = labelLayer.append('g');
      var textLayer = overlayLayer.append('g');
      var hoverLayer = this.hoverGroup.append('g');

      if (node.key) {
        var attributeTranslated = DIMENSION_LONGFORM[node.key][LANG];
        var unit = DIMENSION_UNITS[node.key].suffix;
        var attributeValue = UNIT_CONVERSION(node.value, unit, LANG);
      } else {
        var attributeTranslated = '';
        var attributeValue = '';
      }

      var leftText = textLayer.append('text');
      leftText
        .attr('text-anchor', 'end')
        .attr('x', -this.ballSpacing * 2)
        .attr('font-size', 11)
        .attr('y', 26)
        //.text(node.key + " <= " + parseFloat(node.value));
        .text(attributeTranslated + " <= " + attributeValue);

      var rightText = textLayer.append('text');
      rightText
        .attr('x', this.ballSpacing * 2)
        .attr('font-size', 11)
        .attr('y', 26)
        .text(attributeTranslated + " > " + attributeValue);

      var leftArrow = labelLayer.append('g');
      var rightArrow = labelLayer.append('g');

      var leftLine = leftArrow.append('path')
        .attr('fill', 'none')
        .attr('stroke-width', 1);

      var rightLine = rightArrow.append('path')
        .attr('fill', 'none')
        .attr('stroke-width', 1);

      var leftLeaf = labelLayer.append('rect')
        .attr('opacity', 0);

      var rightLeaf = labelLayer.append('rect')
        .attr('opacity', 0);

      if (node.children) {
        var leftHover = hoverLayer.append('rect')
          .classed('leftHover', true)
          .attr('x', -60)
          .attr('width', 60)
          .attr('y', this.labelOffset * 0.6)
          .attr('height', 60)
          .attr('opacity', 0)
          .on('mouseenter', function() {
            v.splitID = node.children[0].id;
            v.rr = true;
          })
          .on('mouseleave', function() {
            v.splitID = null;
            v.rr = true;
          })

        var rightHover = hoverLayer.append('rect')
          .classed('rightHover', true)
          .attr('x', 0)
          .attr('width', 60)
          .attr('y', this.labelOffset * 0.6)
          .attr('height', 60)
          .attr('opacity', 0)
          .on('mouseenter', function() {
            v.splitID = node.children[1].id;
            v.rr = true;
          })
          .on('mouseleave', function() {
            v.splitID = null;
            v.rr = true;
          })
      }

      this.splitLabels.push({
        node: node,
        layer: labelLayer,
        overlayLayer: overlayLayer,
        hoverLayer: hoverLayer,
        leftHover: leftHover,
        rightHover: rightHover,
        leftArrow: leftArrow,
        rightArrow: rightArrow,
        leftLine: leftLine,
        rightLine: rightLine,
        leftLeaf: leftLeaf,
        rightLeaf: rightLeaf,
        leftText: leftText,
        rightText: rightText
      });
    }, this)

    this.handleResize();
    this.listenTo(Dispatcher, 'resize', this.handleResize);
    this.listenTo(Dispatcher, 'scroll', this.handleScroll);

    this.sampleID = null;
    this.splitID = null;

    this.rr = true;
    R2D3Views.push(this);
  },
  updateSamplePath: function(s, si) {
    var pathString = 'M ' + this.funnelStart.x + ' ' + this.funnelStart.y + ' ';

    var px = 0;

    _.each(s.treeCoordinates, function(p, i) {
      px = this.treeScales.x(p.x);

      pathString += 'L ' + this.treeScales.x(p.x) + ' ' + this.treeScales.y(p.y) + ' ';
      pathString += 'L ' + this.treeScales.x(p.x) + ' ' + (this.treeScales.y(p.y) + this.labelOffset) + ' ';
    }, this);

    pathString += 'L ' + px + ' ' + this.treeScales.y(1.1) + ' ';

    var baseline = this.baseline.training;
    if (s.groupID === "test") {
      baseline = this.baseline.test;
    }

    if (s.classification === "isTarget") {
      // Top of Bin
      pathString += 'L ' + this.treeScales.x(0.75) + ' ' + this.treeScales.y(1.2) + ' ';

      var x = this.treeScales.x(1.05) + s.pileCoordinates.row * this.ballSpacing * -1 + (-this.ballSpacing / 2 * s.pileCoordinates.col); // + 8 * this.ballSpacing;
      var y = s.pileCoordinates.col * this.ballSpacing * -0.86 + baseline;

      pathString += 'L ' + x + ' ' + y + ' ';
    } else {
      // Top of Bin
      pathString += 'L ' + this.treeScales.x(0.25) + ' ' + this.treeScales.y(1.2) + ' ';

      var x = this.treeScales.x(0.02) + s.pileCoordinates.row * this.ballSpacing + (this.ballSpacing / 2 * s.pileCoordinates.col);
      var y = s.pileCoordinates.col * this.ballSpacing * -0.86 + baseline;

      pathString += 'L ' + x + ' ' + y + ' ';
    }

    s.path.attr('d', pathString);

    s.pathLength = s.path.node().getTotalLength();
  },
  handleResize: function() {
    this.bounds = this.el.node().getBoundingClientRect();
    this.offsetTop = $(this.el.node()).offset().top;

    var windowHeight = $window.height();

    if (this.bounds.width > 850) {
      this.ballRadius = 3;
      this.ballSpacing = this.ballRadius + 5;
    } else {
      if (this.bounds.width > 650) {
        this.ballRadius = 2;
        this.ballSpacing = this.ballRadius + 4;
      } else {
        this.ballRadius = 1.5;
        this.ballSpacing = this.ballRadius + 3;
      }
    }

    _.each(this.trainingSamples, function(s) {
      s.circle.attr('r', this.ballRadius);
    }, this);

    _.each(this.testSamples, function(s) {
      s.circle.attr('r', this.ballRadius);
    }, this);

    // Layout Stuff
    this.svg
      .attr('width', this.bounds.width - this.paddingRight)
      .attr('height', this.bounds.height);

    var treeExtent = {
      x: [0, this.bounds.width - this.paddingRight - 40],
      y: [this.bounds.height * 0.05 + this.ballSpacing, this.bounds.height * 0.60]
    }

    this.treeScales = {
      x: d3.scale.linear().domain([0,1]).range(treeExtent.x),
      y: d3.scale.linear().domain([0,1]).range(treeExtent.y)
    }

    this.funnelStart = {
      x: this.treeScales.x(this.tree.nodes[0].x),
      y: this.bounds.height * 0.05
    }

    // Counts for Each Bin
    this.targetCount = {
      train: 0,
      test: 0
    }
    this.notTargetCount = {
      train: 0,
      test: 0
    }

    // Draw Each Split
    _.each(this.splitLabels, function(l) {
      var x = this.treeScales.x(l.node.x);
      var y = this.treeScales.y(l.node.y);

      if (!l.node.children) {
        l.overlayLayer.attr('style', 'display: none;');
      } else {
        l.hoverLayer
          .attr('transform', 'translate(' + x + ', ' + y + ')');
        l.overlayLayer
          .attr('transform', 'translate(' + x + ', ' + y + ')');

        // Hovers
        var hoverWidth = x - this.treeScales.x(l.node.children[0].x);
        var hoverHeight = this.treeScales.y(l.node.children[0].y) - y;

        l.leftHover
          .attr('fill', 'transparent')
          .attr('opacity', 1)
          .attr('x', -hoverWidth)
          .attr('y', hoverHeight * 0.3)
          .attr('width', hoverWidth)
          .attr('height', hoverHeight) // * 2);

        l.rightHover
          .attr('fill', 'transparent')
          .attr('opacity', 1)
          .attr('y', hoverHeight * 0.3)
          .attr('width', hoverWidth)
          .attr('height', hoverHeight) // * 2);

        // Lines
        var midY = (this.treeScales.y(l.node.y) + this.labelOffset + this.ballSpacing);

        var dx0 = x - this.treeScales.x(l.node.children[0].x);
        var dx1 = x - this.treeScales.x(l.node.children[1].x);
        var dy = midY - (this.treeScales.y(l.node.children[0].y) + this.ballSpacing);

        var lineLength = Math.sqrt( dy * dy + dx0 * dx0 );
        var newLineLength = lineLength - this.ballSpacing;

        var theta0 = Math.atan(dy/dx0) + Math.PI;
        var theta1 = Math.atan(dy/dx1);

        var nx0 = x + Math.cos(theta0) * newLineLength; // x + dx * percentOfLength;
        var nx1 = x + Math.cos(theta1) * newLineLength; // x - dx * percentOfLength;

        var ny0 = midY + Math.sin(theta0) * newLineLength; // (this.treeScales.y(l.node.children[0].y) + this.ballSpacing) - dy * (1 - percentOfLength);
        var ny1 = midY + Math.sin(theta1) * newLineLength;

        var leftD = '';
        leftD += 'M ' + x + ' ' + (y + this.labelOffset + this.ballSpacing) + ' ';
        leftD += 'L ' + nx0 + ' ' + ny0 + ' ';
        leftD += 'L ' + nx0 + ' ' + (this.treeScales.y(l.node.children[0].y) + this.labelOffset - this.ballSpacing) + ' ';

        l.leftLine
          .attr('d', leftD);

        var rightD = '';
        rightD += 'M ' + x + ' ' + (y + this.labelOffset + this.ballSpacing) + ' ';
        rightD += 'L ' + nx1 + ' ' + ny1 + ' ';
        rightD += 'L ' + nx1 + ' ' + (this.treeScales.y(l.node.children[0].y) + this.labelOffset - this.ballSpacing) + ' ';

        l.rightLine
          .attr('d', rightD);

        // Leafs
        if (!l.node.children[0].children) {
          var color = FILL_FN("isTarget");
          if(l.node.children[0].value[0] > l.node.children[0].value[1]) {
            // More NY than SF
            color = FILL_FN("isNotTarget");
          }

          l.leftLeaf
            .attr('opacity', 1)
            .attr('x', nx0 - 1)
            .attr('y', ny0 + 14)
            .attr('fill', color)
            .attr('width', 2)
            .attr('height', 10);

        }

        if (!l.node.children[1].children) {
          var color = FILL_FN("isTarget");
          if(l.node.children[1].value[0] > l.node.children[1].value[1]) {
            // More NY than SF
            color = FILL_FN("isNotTarget");
          }

          l.rightLeaf
            .attr('opacity', 1)
            .attr('x', nx1 - 1)
            .attr('y', ny1 + 14)
            .attr('fill', color)
            .attr('width', 2)
            .attr('height', 10);
        }
      }
    }, this);

    // Set the Baseline for
    this.baseline = {};
    this.baseline.training = this.bounds.height * 0.93;
    this.baseline.test = this.baseline.training - this.ballSpacing * 9;

    // Update the Paths
    _.each(this.trainingSamples, this.updateSamplePath, this);
    _.each(this.testSamples, this.updateSamplePath, this);

    // Scroll Stuff
    var trainingTop = this.trainingSection.offset().top;
    var trainingStart = trainingTop - windowHeight * 0.3;
    var trainingEnd = trainingTop + windowHeight * 1.2;

    var testStart = this.testSection.offset().top;
    var testEnd = testStart + windowHeight * 1.5;

    var ballDurationInPixels = Math.round(windowHeight / 4);

    var trainingInterval = Math.floor((trainingEnd - trainingStart - ballDurationInPixels) / this.trainingSamples.length);
    var testInterval = Math.floor((testEnd - testStart - ballDurationInPixels) / this.testSamples.length);

    _.each(this.trainingSamples, function(s, si) {
      var start = trainingStart + si * trainingInterval;
      var end = trainingStart + ballDurationInPixels;

      s.scrollExtent = [start, end];
      s.scrollDuration = ballDurationInPixels;
    });

    _.each(this.testSamples, function(s, si) {
      var start = testStart + si * testInterval;
      var end = testStart + ballDurationInPixels;

      s.scrollExtent = [start, end];
      s.scrollDuration = ballDurationInPixels;
    });

    // Update the Results Section
    this.resultsView.handleResize({
      width: this.bounds.width,
      baseline: {
        training: this.baseline.training + this.ballSpacing,
        test: this.baseline.test + this.ballSpacing
      },
      scrollExtent: {
        training: [trainingStart, trainingEnd],
        test: [testStart, testEnd],
      }
    });

    this.rr = true;

  },
  updatePointPosition: function(sample, scroll) {
    var progress = (scroll - sample.scrollExtent[0]) * 4;
    if (progress < 0) { progress = 0; }
    if (progress > sample.pathLength) {
      progress = sample.pathLength;
      sample.done = true;
    } else {
      sample.done = false;
    }

    var point = sample.path.node().getPointAtLength(progress);

    if (sample.x != point.x || sample.y != point.y) {
      sample.x = point.x;
      sample.y = point.y;
      sample.rr = true;

      return true;
    } else {
      return false;
    }
  },
  handleScroll: function(scroll) {
    var percentages = {
      train: {
        isTarget: {
          correct: 0,
          total: 0
        },
        isNotTarget: {
          correct: 0,
          total: 0
        }
      },
      test: {
        isTarget: {
          correct: 0,
          total: 0
        },
        isNotTarget: {
          correct: 0,
          total: 0
        }
      }
    }

    this.trainingSamples.forEach(function(sample) {
      this.rr = this.updatePointPosition(sample, scroll) || this.rr;

      if (sample.done) {
        percentages.train[sample.classification].total++;

        if (sample.correctlyClassified) {
          percentages.train[sample.classification].correct++;
        }
      }
    }, this);

    this.testSamples.forEach(function(sample) {
      this.rr = this.updatePointPosition(sample, scroll) || this.rr;

      if (sample.done) {
        percentages.test[sample.classification].total++;

        if (sample.correctlyClassified) {
          percentages.test[sample.classification].correct++;
        }
      }

    }, this);

    _.each(['train', 'test'], function(set) {
      _.each(['isTarget', 'isNotTarget'], function(target) {
        if (percentages[set][target].total > 0) {
          percentages[set][target].percent = Math.round(percentages[set][target].correct / percentages[set][target].total * 100);
        } else {
          percentages[set][target].percent = 0;
        }

        this.resultsView.updateNumber(set, target, percentages[set][target]);
      }, this)
    }, this);
  },
  renderSamples: function(sample) {
    // Move the Circle
    if (sample.rr) {
      sample.circle
        .attr('cx', sample.x)
        .attr('cy', sample.y);
    }

    // Highlight Path
    if (this.sampleID) {
      if (this.sampleID == sample.attributes.index && sample.path.attr('opacity') <= 0) {
        sample.path.attr('opacity', 1);
      }

      if (this.sampleID != sample.attributes.index && sample.path.attr('opacity') > 0) {
        sample.path.attr('opacity', 0);
      }
    } else {
      if (this.splitID) {
        if (sample.waypoints.indexOf(this.splitID) >= 0) {
          sample.path.attr('opacity', 0.1);
        } else {
          sample.path.attr('opacity', 0);
        }
      }
    }

    if (!this.sampleID && !this.splitID) {
      sample.path.attr('opacity', 0);
    }
  },
  render: function() {
    this.trainingSamples.forEach(this.renderSamples, this);
    this.testSamples.forEach(this.renderSamples, this);

    this.splitLabels.forEach(function(s) {
      if (this.splitID) {
        if(s.node.children) {
          if (this.splitID == s.node.children[0].id) {
            s.leftText.attr('style', 'display: block;');
            s.leftLine
              .attr('stroke', '#333333')
              .attr('stroke-width', 2);

          } else {
            s.leftText.attr('style', 'display: none;');
            s.leftLine
              .attr('stroke', '#bbbbbb')
              .attr('stroke-width', 1);;
          }

          if (this.splitID == s.node.children[1].id) {
            s.rightText.attr('style', 'display: block;');
            s.rightLine
              .attr('stroke', '#333333')
              .attr('stroke-width', 2);;
          } else {
            s.rightText.attr('style', 'display: none;');
            s.rightLine
              .attr('stroke', '#bbbbbb')
              .attr('stroke-width', 1);;
          }
        }
      } else {
        s.rightText.attr('style', 'display: none;');
        s.leftText.attr('style', 'display: none;');

        s.leftLine
          .attr('stroke', '#bbbbbb')
          .attr('stroke-width', 1);
        s.rightLine
          .attr('stroke', '#bbbbbb')
          .attr('stroke-width', 1);
      }
    }, this)
  }
})

test_data = ComputeTestTree(tree_data, tree_test_set);

var DecisionTree = new DecisionTreeView({
  el: $("#decision-tree"),
  data: {
    tree: tree_data,
    stats: tree_stats
  }
});
// var DecisionTreeSticky = new StickyDivView({
//   el : $("#decision-tree"),
//   topFn: function() { return $("#tree").offset().top; },
//   bottomFn: function() { return $("#test").offset().top; }
// });
//
// var AnimatedClassifier = new AnimatedClassifierView({
//   el : d3.select("#train-vs-test"),
//   treeData: tree_data,
//   training: tree_training_set,
//   training_stats: tree_stats,
//   test: tree_test_set,
//   test_stats: test_stats
// })
// var TestSetSticky = new StickyDivView({
//   el : $("#train-vs-test"),
//   topFn: function() { return $("#test").offset().top; },
//   bottomFn: function() { return $("#conclusion").offset().top; }
// })

Dispatcher.trigger("resize");
draw();

