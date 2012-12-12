if (typeof process !== "undefined") {
    require("amd-loader");
}

define(function(require, exports, module) {
"use strict";


var Tokenizer = require("../../tokenizer").Tokenizer;
var Document = require("../../document").Document;
var MustacheRules = require("../mustache_rules").MustacheRules;
var MustacheTokenTree = require("./mustache_token_tree").MustacheTokenTree;
var assert = require("../../test/assertions");

function loadChange(mustacheTokenTree, text) {
    var lines = text.split("\n");
    mustacheTokenTree.change({
        start : {
            row : 0, column : 0
        },
        end : {
            row : lines.length - 1, column : lines[lines.length - 1]    .length
        }
    });
}

module.exports = {
    setUp : function() {
        this.doc = new Document("");
        this.tokenizer = new Tokenizer(MustacheRules.getRules());
        this.mustacheTokenTree = new MustacheTokenTree(this.doc, this.tokenizer);
    },

    "test: traverse": function() {
        this.setUp();

        var text = "{{#aaa}} {{a}} {{/bbb}}";
        this.doc.setValue(text);
        loadChange(this.mustacheTokenTree, text);

        var result = this.mustacheTokenTree.reverseTraverse(
            {row : 0, column : 0}, 
            {row : 0, column : text.indexOf("{{a}}") + 1}, 
            "mu.block"
        );

        assert.equal(result.getTokenValue(), "{{#aaa}}");

        result = this.mustacheTokenTree.reverseTraverse(
            {row : 0, column : 0}, 
            {row : 0, column : text.indexOf(" {{/bbb}}") + 1},
            "mu.block"
        );

        assert.equal(result.getTokenValue(), "{{#aaa}}");
    },

    "test: find parent inner-single" : function() {
        this.setUp();
        var text = "{{#aaa}} {{a}} {{/bbb}}";
        this.doc.setValue(text);
        loadChange(this.mustacheTokenTree, text);

        var result = this.mustacheTokenTree.getParent(
            {row : 0, column : 0}, 
            {row : 0, column : text.indexOf("{{a}}") + 1}
        );

        assert.equal(result.getTokenValue(), "{{#aaa}}");
    }, 

    "test: find parent endblock1" : function() {
        this.setUp();
        var text = "{{#aaa}} {{a}} {{/bbb}}";
        this.doc.setValue(text);
        loadChange(this.mustacheTokenTree, text);

        var result = this.mustacheTokenTree.getParent(
            {row : 0, column : 0}, 
            {row : 0, column : text.indexOf("{{/bbb}}") + 1}
        );

        assert.equal(result, null);
    },

    "test: find parent endblock2" : function() {
        this.setUp();
        var text = text = "{{#p1}} {{#aaa}} {{a}} {{/bbb}}";
        this.doc.setValue(text);
        loadChange(this.mustacheTokenTree, text);

        var result = this.mustacheTokenTree.getParent(
            {row : 0, column : 0}, 
            {row : 0, column : text.indexOf("{{/bbb}}") + 1}
        );

        assert.equal(result.getTokenValue(), "{{#p1}}");
    },

    "test: find parent skip comment1" : function() {
        this.setUp();
        var text = text = "{{#p1}} {{#aaa}} {{a}} {{/bbb}} \n {{1}} \n {{2}} ";
        this.doc.setValue(text);
        loadChange(this.mustacheTokenTree, text);

        var lines = text.split("\n");
        var result = this.mustacheTokenTree.getParent(
            {row : 0, column : 0},
            {row : 2, column : lines[2].indexOf("{{2}}") + 1}
        );

        assert.equal(result.getTokenValue(), "{{#p1}}");
    },

    "test: find parent skip comment2" : function() {
        this.setUp();
        var text = "{{#p1}} {{#aaa}} {{a}} {{! {{/bbb}} \n }} {{1}} \n {{! {{2}} }}";
        this.doc.setValue(text);
        loadChange(this.mustacheTokenTree, text);

        var lines = text.split("\n");
        var result = this.mustacheTokenTree.getParent(
            {row : 0, column : 0}, 
            {row : 2, column : lines[2].indexOf("{{2}}") + 1}
        );

        assert.equal(result.getTokenValue(), "{{#aaa}}");
    }
};

});

if (typeof module !== "undefined" && module === require.main) {
    require("asyncjs").test.testcase(module.exports).exec();
}