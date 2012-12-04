define(function(require, exports, module) {
"use strict";

var oop = require("../lib/oop");
var HtmlHighlightRules = require("./html_highlight_rules").HtmlHighlightRules;

var MustacheHighlightRules = function() {

	this.$rules = {
		mustache : [{
			token : "mu",
			regex : /[{{]/,
		}]
	};

	oop.mixin(this.$rules, new HtmlHighlightRules().getRules());
}

oop.inherits(MustacheHighlightRules, HtmlHighlightRules);

exports.MustacheHighlightRules = MustacheHighlightRules;

});
