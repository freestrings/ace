define(function(require, exports, module) {
"use strict";

var MustacheNodeGroupIterator = require("./mustache_node_group_iterator").MustacheNodeGroupIterator;

var MustacheOutlineView = function(container) {
};

(function() {

    this.inputChanged = function(old, _new) {
        console.log(old, _new);   
    }

}).call(MustacheOutlineView.prototype);

exports.MustacheOutlineView = MustacheOutlineView;

});