define(function(require, exports, module) {
"use strict";

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


var MustacheTokenTree = function(doc, tokenizer) {
    this.doc = doc;
    this.tokenizer = tokenizer;
    this.list = new List();
};

(function() {

    this.getNode = function(row, column) {
        var group = this.list.get(row);
        if(!group) {
            return;
        }

        var c = 0;
        for(var i = 0 ; i < group.size() ; i++) {
            c += group.get(i).token.value.length;
            if (c >= column) {
                return {
                    node : group.get(i),
                    index : i,
                    tokenPosition : c
                }
            }
        }
    }

    this.getParent = function(row, column, ignoreEndBlock) {
        var nodeInfo = this.getNode(row, column);
        if(!nodeInfo) {
            return ;
        }
        var n, group, c = nodeInfo.tokenPosition;
        for(var i = nodeInfo.index - 1 ; i > -1 ; i--) {
            n = this.list.get(row).get(i);
            c += n.token.value.length;
            if(n.isBlock()) {
                if(nodeInfo.node.isEndBlock() && !ignoreEndBlock) {
                    return this.getParent(row, c, true);
                } else {
                    return n;
                }
            }
        }
        for(var i = row - 1 ; i > -1 ; i--) {
            group = this.list.get(row);
            if(!group) {
                return;
            }
            c = 0;
            for(var j = group.length - 1 ; j > - 1  ; j--) {
                n = group.get(j);
                c += n.token.value.length;
                if(n.isBlock()) {
                    if(n.isEndBlock() && !ignoreEndBlock) {
                        return this.getParent(i, j, true);
                    } else {
                        return n;
                    }
                }
            }
        }
    }

    this.change = function(range) {
        var start = range.start;
        var end = range.end;
        var text, result, tokens, token, group, oldGroup;

        for(var i = start.row ; i <= end.row ; i++) {
            text = this.doc.getLine(i);
            console.log("# ", text);
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
        
        // TODO trigger changed


        /*
        var allText = this.doc.getLines(0, this.doc.$lines.length);
        var allTokens = this.tokenizer.getLineTokens(allText);
        console.log("@@", allText);
        for(var i = 0 ; i < allTokens.tokens.length ; i++) {
            console.log("\t", allTokens.tokens[i]);
        }
        */
        console.log("<----------------");
        this.list.iterate(function(idx, d) {
            console.log(idx, d);
        });
        console.log("\n\n");
    }
}).call(MustacheTokenTree.prototype);

exports.MustacheTokenTree = MustacheTokenTree;
});