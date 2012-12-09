define(function(require, exports, module) {
"use strict";

var lang = require("../lib/lang");

var rules = {
    start : [{
        token : "mu.open-partial",
        regex : "\{\{>"
    }, {
        token : "mu.open-block",
        regex : "\{\{#"
    }, {
        token : "mu.open-endblock",
        regex : "\{\{\/"
    }, {
        token : "mu.open-inverse",
        regex : "\{\{\\^"
    }, {
        token : "mu.open-unescaped",
        regex : "\{\{\{"
    }, {
        token : "mu.open-unescaped",
        regex : "\{\{&"
    }, {
        token : "mu.comment",
        regex : "\{\{\\!",
        next : "mu.comment"
    }, {
        token : "mu.open",
        regex : "\{\{"
    }, {
        token : "mu.close",
        regex : "\}\}\}"
    }, {
        token : "mu.close",
        regex : "\}\}"
    }],

    "mu.comment" : [{
        token : "mu.comment",
        regex : "[\\s\\S]*?\}\}",
        next : "start"
    }, {
        token : "mu.comment",
        merge : true,
        regex : ".+"
    }]
};

var MustacheRules = {
    getRules : function() { 
        return lang.deepCopy(rules);
    }
};

exports.MustacheRules = MustacheRules;

});