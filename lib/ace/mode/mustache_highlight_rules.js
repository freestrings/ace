define(function(require, exports, module) {
"use strict";

var oop = require("../lib/oop");
var lang = require("../lib/lang");
var HtmlHighlightRules = require("./html_highlight_rules").HtmlHighlightRules;
var MustacheRules = require("./mustache_rules").MustacheRules;

var MustacheHighlightRules = function() {

	var parentRules = new HtmlHighlightRules().getRules();
    var rules = MustacheRules.getRules();
    var targetRules = lang.deepCopy(parentRules);

    for(var state in rules) {
        var rule = rules[state];
        var parentRule = parentRules[state];
        targetRules[state] = parentRule ? rule.concat(parentRule) : rule;
    }

	this.$rules = targetRules;

}

oop.inherits(MustacheHighlightRules, HtmlHighlightRules);

exports.MustacheHighlightRules = MustacheHighlightRules;

});
