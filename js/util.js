var Dispatcher = _.clone(Backbone.Events);
var R2D3Views = [];
var scrollTop = 0, actualScrollTop = 0;

$window = $(window);
$window.on('resize', _.debounce(function() {
  Dispatcher.trigger('resize');
}, 700));

var draw = function() {
  requestAnimationFrame(draw);

  // Drawing code goes here
  _.each(R2D3Views, function(v, i) {
    if (!v.rr) { return; }
    v.rr = false;
    v.render(); // Let the view have the last word about re-rendering next frame.
  });

  if (actualScrollTop != scrollTop) {
    newScrollTop = ZENO(scrollTop, actualScrollTop);
    Dispatcher.trigger('scroll', newScrollTop);
    scrollTop = newScrollTop;
  }
}

var FILL_FN = function(d, o) {
  // https://color.adobe.com/tree-color-theme-5926460/
  if (!o) {
    o = 1;
  }

  if ((typeof d == 'object' && d['target'] > 0.5) || d === 'isTarget' || (typeof d == 'boolean' && d)) {
    // return 'rgba(130,140,53,' + o + ')'; // SF
    // return 'rgba(242,85,44,' + o + ')'; // Giants Orange
    // return 'rgba(253,185,39,' + o + ')'; // Warriors Gold
    // return 'rgba(211,144,36,' + o + ')'; // Warriors Gold, slightly darkened
    // return 'rgba(215,126,39,' + o + ')'; // Another Orange
    // return 'rgba(215,126,39,' + o + ')'; // Another Orange
    return 'rgba(65,153,43,' + o + ')'; // Another Green
  } else {
    // return 'rgba(69,110,191,' + o + ')'; // NYC
    // return 'rgba(38,82,126,' + o + ')'; // Yankee Blue
    // return 'rgba(0,107,182,' + o + ')'; // Knicks Blue
    return 'rgba(16,70,131,' + o + ')'; // Another Blue
  }
}

