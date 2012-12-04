define(function(require, exports, module) {
"use strict";

console.log("call mustache");

var oop = require("../lib/oop");
var HtmlMode = require("./html").Mode;
var Tokenizer = require("../tokenizer").Tokenizer;
var MustacheHighlightRules = require("./mustache_highlight_rules").MustacheHighlightRules;

var Mode = function() {
    var highlighter = new MustacheHighlightRules();
    this.$tokenizer = new Tokenizer(highlighter.getRules());
    
    this.$embeds = highlighter.getEmbeds();
};
oop.inherits(Mode, HtmlMode);

(function() {

    this.toggleCommentLines = function(state, doc, startRow, endRow) {
        return 0;
    };

    this.getNextLineIndent = function(state, line, tab) {
        return this.$getIndent(line);
    };

    this.checkOutdent = function(state, line, input) {
        return false;
    };

}).call(Mode.prototype);

exports.Mode = Mode;
});
