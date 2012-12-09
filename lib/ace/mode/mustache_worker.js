define(function(require, exports, module) {
"use strict";

var oop = require("../lib/oop");
var Mirror = require("../worker/mirror").Mirror;
var Tokenizer = require("../tokenizer").Tokenizer;
var MustacheRules = require("./mustache_rules").MustacheRules;
var MustacheTokenTree = require("./mustache/mustache_token_tree").MustacheTokenTree;

var MustacheWorker = exports.MustacheWorker = function(sender) {
    Mirror.call(this, sender);

    var self = this;
    sender.on("change", function(e) {
        self.onChange(e.data);
    });

    this.tokenizer = new Tokenizer(MustacheRules.getRules());
    this.tokenTree = new MustacheTokenTree(this.doc, this.tokenizer);
};

oop.inherits(MustacheWorker, Mirror);

(function() {

    this.onUpdate = function() {
        //TODO check validate
    };

    this.onChange = function(data) {
        this.tokenTree.change(data.range);
    }

}).call(MustacheWorker.prototype);

});