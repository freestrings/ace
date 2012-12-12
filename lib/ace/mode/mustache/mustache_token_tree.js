define(function(require, exports, module) {
"use strict";

// var oop = require("../../lib/oop");
// var EventEmitter = require("../../lib/event_emitter").EventEmitter;

var MustacheNode = function(token) {
    this.token = token;
};

(function() {
    this.getType = function() {
        return this.token.type;
    }
    this.isBlock = function() {
        return this.getType() === "mu.block" || this.getType() === "mu.inverseblock";
    }
    this.isSingle = function() {
        return this.getType() === "mu.single" || this.getType() === "mu.open-unescaped";
    }
    this.isComment = function() {
        return this.getType() === "mu.comment";
    }
    this.isEndBlock = function() {
        return this.getType() === "mu.endblock";
    }
    this.isMustache = function() {
        return typeof this.getType() === "string" && this.getType().indexOf("mu") === 0;
    }
    this.isComment = function() {
        return this.getType() === "mu.comment" || this.getType() === "mu.commentend";   
    }
    this.isCommentStart = function() {
        return this.getType() === "mu.commentstart";
    }
    this.getTokenLength = function() {
        return this.token.value.length;
    }
    this.getTokenValue = function() {
        return this.token.value;
    }
    this.toString = function() {
        return this.getType() + ", " + this.token.value;
    }
}).call(MustacheNode.prototype);

//
// TODO linked list
//
var List = function() {
    this.data = {};
    this.length = 0;
};

(function() {

    this.size = function() {
        return this.length;
    }
    this.increzeLength = function(index) {
        this.length = Math.max(index + 1, this.length);
    }
    this.decreaseLength = function() {
        for(var i = this.length - 2 ; i > -1 ; i--) {
            if(this.data[i]) {
                this.length = i + 1;
                return;
            }
        }
        this.length = 0;
    }
    this.add = function(obj) {
        this.data[this.length] = obj;
        this.increzeLength(this.length);
    }
    this.insertAt = function(index, obj) {
        this.data[index] = obj;
        this.increzeLength(index);
    }
    this.remove = function(comparable) {
        // TODO 
    }
    this.removeAt = function(index) {
        delete this.data[index];
        if(index == this.length - 1) {
            this.decreaseLength();
        }
    }
    this.get = function(index) {
        return this.data[index];
    }
    this.iterate = function(func) {
        var d;
        for(var i = 0 ; i < this.length ; i++) {
            d = this.data[i];
            if(!d) {
                continue;
            }

            if(func(i, d) === false) {
                break;
            }
        }
    }
    this.reverseIterate = function() {
        var d;
        for(var i = this.length - 1 ; i > -1 ; i--) {
            d = this.data[i];
            if(!d) {
                continue;
            }

            if(func(i, d) === false) {
                break;
            }
        }
    }
}).call(List.prototype);

/*
 * @start : range (row, column)
 * @end : range (row, column)
 */
var GroupIterator = function(list, start, end) {
    this.list = list;
    this.start = start;
    this.end = end;
};

(function() {
    this.iterate = function(func) {
        // TODO
    }
    this.reverseIterate = function(func) {
        var group, 
        node, 
        c, // token position in a row
        len, // total length of a row.
        startNodeIndex; // node start index of group.

        for(var i = this.end.row ; i >= this.start.row ; i--) {
            group = this.list.get(i);
            c = 0, len = 0, startNodeIndex = -1;

            // find start node
            for(var j = 0 ; group && j < group.size() ; j++) {
                len += group.get(j).getTokenLength();
                if(this.end.row === i && this.end.column > -1
                    && startNodeIndex === -1 && len >= this.end.column) {
                    startNodeIndex = j;
                } else if(this.end.row > i) {
                    startNodeIndex = group.size() - 1;
                }
            }

            for(var j = startNodeIndex ; group && j > -1  ; j--) {
                node = group.get(j);
                c += node.getTokenLength();
                if(this.start.row === i && len - c < this.start.column) {
                    return;
                }
                if(func(node, i, j) === false) {
                    return;
                }
            }
        }
    }
}).call(GroupIterator.prototype);

var MustacheTokenTree = function(doc, tokenizer) {
    this.doc = doc;
    this.tokenizer = tokenizer;
    this.list = new List();
};

// oop.inherits(MustacheTokenTree, EventEmitter);

(function() {

    /*
     * traverse all the token until match to given token type
     * @startRange : {row, column}
     * @endRange : {row, column}
     */
    this.traverse = function(startRange, endRange, tokenType) {
        var iter = new GroupIterator(this.list, startRange, endRange);
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
        var iter = new GroupIterator(this.list, startRange, endRange);
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
        var iter = new GroupIterator(this.list, startRange, endRange);
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
            group = new List();
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

