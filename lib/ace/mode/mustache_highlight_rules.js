define(function(require, exports, module) {
"use strict";

var oop = require("../lib/oop");
var HtmlHighlightRules = require("./html_highlight_rules").HtmlHighlightRules;

var MustacheHighlightRules = function() {

	var rules = new HtmlHighlightRules().getRules();
	rules.start.unshift({
		token : "meta.tag", 
		regex : "{{"
	});
	this.$rules = rules;
}

oop.inherits(MustacheHighlightRules, HtmlHighlightRules);

exports.MustacheHighlightRules = MustacheHighlightRules;

});
