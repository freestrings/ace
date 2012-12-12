define(function(require, exports, module) {
"use strict";

var oop = require("../lib/oop");
var HtmlMode = require("./html").Mode;
var Tokenizer = require("../tokenizer").Tokenizer;
var MustacheHighlightRules = require("./mustache_highlight_rules").MustacheHighlightRules;
var WorkerClient = require("../worker/worker_client").WorkerClient;

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

    this.createWorker = function(session) {
        var validationWorker = new WorkerClient(["ace"], "ace/mode/mustache_worker", "MustacheValidationWorker");
        validationWorker.attachToDocument(session.getDocument());

        var tokenWorker = new WorkerClient(["ace"], "ace/mode/mustache_worker", "MustacheTokenWorker");
        tokenWorker.attachToDocument(session.getDocument());

        tokenWorker.on("nodeChange", function(e) {
            console.log("@@@", e);
        });

        return [validationWorker, tokenWorker];
    };

}).call(Mode.prototype);

exports.Mode = Mode;
});
