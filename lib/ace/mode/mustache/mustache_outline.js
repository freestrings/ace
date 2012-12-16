define(function(require, exports, module) {
"use strict";

var MustacheOutlineView = function(container) {
};

(function() {

    this.inputChanged = function(event, object) {
        console.log(event, object);
    }

}).call(MustacheOutlineView.prototype);

exports.MustacheOutlineView = MustacheOutlineView;

});