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

module.exports = {
    setUp : function() {
    },

    "test: getParent": function() {
        var doc = new Document("{{#aaa}} {{a}} {{/bbb}}");
        var tokenizer = new Tokenizer(MustacheRules.getRules());
        var mustacheTokenTree = new MustacheTokenTree(doc, tokenizer);
        mustacheTokenTree.change({
            start : {
                row : 0, column : 0
            },
            end : {
                row : 0, column : doc.getLength()
            }
        });
        var parent = mustacheTokenTree.getParent(0, 12);
        assert.equal(parent.token.value, "{{#aaa}}");
    }, 
    "test: getParent2": function() {
        var doc = new Document("{{#aaa}} {{a}} {{/bbb}}");
        var tokenizer = new Tokenizer(MustacheRules.getRules());
        var mustacheTokenTree = new MustacheTokenTree(doc, tokenizer);
        mustacheTokenTree.change({
            start : {
                row : 0, column : 0
            },
            end : {
                row : 0, column : doc.getLength()
            }
        });
        var parent = mustacheTokenTree.getParent(0, 16);
        assert.equal(parent, null);
    }
};

});

if (typeof module !== "undefined" && module === require.main) {
    require("asyncjs").test.testcase(module.exports).exec();
}