define(function(require, exports, module) {
"use strict";

var lang = require("../lib/lang");

var rules = {
    start : [{
        token : "mu.commentstart",
        regex : "\{\{\\!",
        next : "mu.comment"
    }, {
        token : "mu.partial",
        regex : "\{\{>[\\s\\S]*?\}\}"
    }, {
        token : "mu.block",
        regex : "\{\{#[\\s\\S]*?\}\}"
    }, {
        token : "mu.endblock",
        regex : "\{\{\/[\\s\\S]*?\}\}"
    }, {
        token : "mu.inverseblock",
        regex : "\{\{\\^[\\s\\S]*?\}\}"
    }, {
        token : "mu.open-unescaped",
        regex : "\{\{&[\\s\\S]*?\}\}"
    }, {
        token : "mu.single",
        regex : "\{\{[\\s\\S]*?\}\}"
    }, {
        token : "mu.open",
        regex : "\{\{"
    }, {
        token : "mu.close",
        regex : "\}\}",
    }],

    "mu.comment" : [{
        token : "mu.commentend",
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