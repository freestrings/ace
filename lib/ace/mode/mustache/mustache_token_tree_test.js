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
        var text = "{{#aaa}} {{a}} {{/bbb}}";
        this.doc.setValue(text);
        loadChange(this.mustacheTokenTree, text);

        var result = this.mustacheTokenTree.reverseTraverse(
            {row : 0, column : 0}, 
            {row : 0, column : text.indexOf("{{a}}") + 1}, 
            "mu.block"
        );

        assert.equal(result.getTokenValue(true), "{{#aaa}}");

        result = this.mustacheTokenTree.reverseTraverse(
            {row : 0, column : 0}, 
            {row : 0, column : text.indexOf(" {{/bbb}}") + 1},
            "mu.block"
        );

        assert.equal(result.getTokenValue(true), "{{#aaa}}");
    },

    "test: partialParse1" : function() {
        var text = "{{#aaa}}{{a}}{{/bbb}}";
        this.doc.setValue(text);
        loadChange(this.mustacheTokenTree, text);

        var root = this.mustacheTokenTree.partialParse({row : 0, column: 0}, {row : 0, column : text.length});
        var children = root.getChildren();
        assert.equal(children.length, 1);

        var aaa = children[0].getChildren();
        assert.equal(aaa.length , 2);
        assert.equal(aaa[1].getNode().getTokenValue(), "bbb");
    },

    "test: partialParse2" : function() {
        var text = "{{#aaa}}{{a}}{{/aaa}}";
        this.doc.setValue(text);
        loadChange(this.mustacheTokenTree, text);

        var root = this.mustacheTokenTree.partialParse({row : 0, column: 0}, {row : 0, column : text.length});
        var children = root.getChildren();
        assert.equal(children.length, 1);

        var aaa = children[0].getChildren();
        assert.equal(aaa.length , 1);
        assert.equal(aaa[0].getNode().getTokenValue(), "a");
    },

    "test: partialParse3" : function() {
        var text = "{{#aaa}}{{a}}{{/aaa}}{{AAA}}{{#BBB}}{{/BBB}}{{/aaa}}";
        this.doc.setValue(text);
        loadChange(this.mustacheTokenTree, text);

        var root = this.mustacheTokenTree.partialParse({row : 0, column: 0}, {row : 0, column : text.length});
        var children = root.getChildren();
        assert.equal(children.length, 4);

        var aaa = children[3].getNode();
        assert.equal(aaa.isEndBlock(), true);
        assert.equal(aaa.getTokenValue(), "aaa");
    }
};

});

if (typeof module !== "undefined" && module === require.main) {
    require("asyncjs").test.testcase(module.exports).exec();
}