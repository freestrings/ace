define(function(require, exports, module) {
"use strict";

var oop = require("../lib/oop");
var Mirror = require("../worker/mirror").Mirror;
var Tokenizer = require("../tokenizer").Tokenizer;
var MustacheRules = require("./mustache_rules").MustacheRules;
var MustacheTokenTree = require("./mustache/mustache_token_tree").MustacheTokenTree;

var MustacheValidationWorker = exports.MustacheValidationWorker = function(sender) {
    Mirror.call(this, sender);
};

oop.inherits(MustacheValidationWorker, Mirror);

(function() {

    this.onUpdate = function() {
        //TODO check validate
    };

}).call(MustacheValidationWorker.prototype);

var MustacheTokenWorker = exports.MustacheTokenWorker = function(sender) {
    Mirror.call(this, sender);

    var self = this;
    sender.on("change", function(e) {
        self.onChange(e.data);
    });

    this.tokenizer = new Tokenizer(MustacheRules.getRules());
    this.tokenTree = new MustacheTokenTree(this.doc, this.tokenizer);
}

oop.inherits(MustacheTokenWorker, Mirror);

(function() {
    this.onChange = function(data) {
        this.tokenTree.change(data.range);
        var tokenList = this.tokenTree.getTokenList();
        console.log(tokenList);
    }
}).call(MustacheTokenWorker.prototype);

});