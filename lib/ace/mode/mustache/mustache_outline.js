define(function(require, exports, module) {
"use strict";

var MustacheNodeGroupIterator = require("./mustache_node_group_iterator").MustacheNodeGroupIterator;

var MustacheOutlineView = function(container) {
};

(function() {

    this.inputChanged = function(e) {
        var input = e.data;
        var tokenList = input.data;
        var changedRange = input.range;

        this.groupIterator = new MustacheNodeGroupIterator(tokenList, changedRange.start, changedRange.end);
        this.buildAffectedNode(changedRange);
    }

    this.buildAffectedNode = function(changedRange) {
        var s = changedRange.start;
        var e = changedRange.end;


    }

}).call(MustacheOutlineView.prototype);

exports.MustacheOutlineView = MustacheOutlineView;

});