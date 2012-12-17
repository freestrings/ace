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
    this.sender = sender;
    var self = this;
    sender.on("change", function(e) {
        self.onChange(e.data);
    });

    this.tokenizer = new Tokenizer(MustacheRules.getRules());
    this.tokenTree = new MustacheTokenTree(this.doc, this.tokenizer);
    var onTokenTreeChanged = this.onTokenTreeChanged.bind(this);
    this.tokenTree.on("changed", onTokenTreeChanged);
}

oop.inherits(MustacheTokenWorker, Mirror);

(function() {
    this.onTokenTreeChanged = function(data) {
        this.sender.emit("nodeChange", { event : data.event, object : data.object });
    }
    this.onChange = function(data) {
        this.tokenTree.change(data.action, data.range, data.text);
    }
}).call(MustacheTokenWorker.prototype);

});