define(function(require, exports, module) {
"use strict";

var MustacheNode = require("./mustache_node").MustacheNode;
var NodeList = require("./mustache_node").NodeList;
var MustacheNodeGroupIterator = require("./mustache_node_group_iterator").MustacheNodeGroupIterator;

var MustacheTokenTree = function(doc, tokenizer) {
    this.doc = doc;
    this.tokenizer = tokenizer;
    this.list = new NodeList();
};

(function() {

    /*
     * traverse all the token until match to given token type
     * @startRange : {row, column}
     * @endRange : {row, column}
     */
    this.traverse = function(startRange, endRange, tokenType) {
        var iter = new MustacheNodeGroupIterator(this.list, startRange, endRange);
        var result;
        iter.iterate(function(node) {
            if(node.getType() === tokenType) {
                result = node;
                return false;
            }
        });
        return result;
    }

    this.reverseTraverse = function(startRange, endRange, tokenType) {
        var iter = new MustacheNodeGroupIterator(this.list, startRange, endRange);
        var result;
        iter.reverseIterate(function(node, tokenRow, tokenColumn) {
            if(node.getType() === tokenType) {
                result = node;
                return false;
            }
        });
        return result;
    }

    /*
     * not a syntactic tree traversing. it will find a closest block type node.
     */
    this.getParent = function(startRange, endRange) {
        var group = this.list.get(endRange.row);
        var node, c = 0;

        //find start node;
        for(var i = 0 ; i < group.size() ; i++) {
            node = group.get(i);
            c += node.getTokenLength();
            if(c >= endRange.column) {
                break;
            }
        }
        if(!node) {
            return ;
        }
        var endRange = { row : endRange.row, column : c};
        var iter = new MustacheNodeGroupIterator(this.list, startRange, endRange);
        var result, resultRow, resultColumn, skipCount = 0;
        iter.reverseIterate(function(node, tokenRow, tokenColumn) {
            //console.log(node.getType(), node.getTokenValue());
            if(node.isComment() || node.isCommentStart()) {
                return true;
            }
            if(node.isEndBlock()) {
                skipCount++;
            } else if(node.isBlock() && skipCount-- <= 0) {
                result = node;
                return false;
            }
        });
        return result;
    }

    this.change = function(range) {
        var start = range.start;
        var end = range.end;
        var text, result, tokens, token, group, oldGroup;

        for(var i = start.row ; i <= end.row ; i++) {
            text = this.doc.getLine(i);
            // console.log("# ", text);
            result = this.tokenizer.getLineTokens(text);
            tokens = result.tokens;
            group = new NodeList();
            for(var j = 0 ; j < tokens.length ; j++) {
                token = tokens[j];
                group.add(new MustacheNode(token));
            }
            
            oldGroup = this.list.get(i);

            if(group.size() > 0) {
                this.list.insertAt(i, group);    
            } else {
                this.list.removeAt(i);    
            }

        }


        
        // console.log("<----------------");
        // this.list.iterate(function(idx, d) {
        //     console.log(idx, d);
        // });
        // console.log("\n\n");
    }

    this.getTokenList = function() {
        return this.list;
    }

}).call(MustacheTokenTree.prototype);

exports.MustacheTokenTree = MustacheTokenTree;
});

