define(function(require, exports, module) {
"use strict";

var oop = require("../../lib/oop");
var EventEmitter = require("../../lib/event_emitter").EventEmitter;
var MustacheNode = require("./mustache_node").MustacheNode;
var NodeList = require("./mustache_node").NodeList;
var MustacheAST = require("./mustache_node").MustacheAST;
var InsertAwareMustacheAST = require("./mustache_node").InsertAwareMustacheAST;
var MustacheNodeGroupIterator = require("./mustache_node_group_iterator").MustacheNodeGroupIterator;

var MustacheTokenTree = function(doc, tokenizer) {
    this.doc = doc;
    this.tokenizer = tokenizer;
    //
    // the row value of list match real text line number;
    // token wrappers that are MustacheNode or MustacheAST or InsertAwareMustacheAST are stored.
    this.list = new NodeList();
    this.documetAstNode = new MustacheAST(null);
};

(function() {    

    oop.implement(this, EventEmitter);

    /**
     * traverse all the MustacheAST until match to given condition
     * @param direction : if true, forward. unless true, backward
     * @param startPosition : {row, column}
     * @param endPosition : {row, column}
     * @param condition : function type argument
     * @return matched MustacheAST
     * @private
     */
    this._traverse = function(direction, startPosition, endPosition, condition) {
        var iter = new MustacheNodeGroupIterator(this.list, startPosition, endPosition);
        var result;
        var func = direction === true ? iter.iterate : iter.reverseIterate;

        func.call(iter, function(node, tokenRow, tokenColumn, lastEmptyLine) {
            if(condition(node, tokenRow, tokenColumn, lastEmptyLine) === true) {
                result = node;
                return false;
            }
        });
        return result;
    }

    this.traverse = function(startPosition, endPosition, condition) {
        return this._traverse(true, startPosition, endPosition, condition);
    }

    this.reverseTraverse = function(startPosition, endPosition, condition) {
        return this._traverse(false, startPosition, endPosition, condition);
    }

    this.getTokenInfo = function(row, column) {
        var tokens = this.tokenizer.getLineTokens(this.doc.getLine(row)).tokens;
        var c = 0;
        for(var i = 0 ; i < tokens.length ; i++) {
            c += tokens[i].value.length;
            if(c > column) {
                return {token : tokens[i], index : i};
            }
        }
        return {token : tokens[tokens.length - 1], index : tokens.length - 1};
    }

    /**
     * compute a parent from old ast
     *
     * @param row position of current token
     * @param column position of current token
     */
    this.getParent = function(row, column) {
        var tokenInfo = this.getTokenInfo(row, column);
        var inputNode = new MustacheNode(tokenInfo.token);
        var previousAst = this.getPreviousSibling(row, column);
        var previousNode = previousAst.getNode();

        if(!previousAst.isRoot() && // node of root is null
            // Is it a matched block?
            previousNode.isBlock() && inputNode.isEndBlock() &&
            inputNode.getTokenValue() === previousNode.getTokenValue()) {
            return previousAst.getParent() ? previousAst.getParent() : this.documetAstNode;
        } else if(!previousAst.isRoot() && previousNode.isBlock()){
            return previousAst;
        } else if(!previousAst.isRoot() && previousNode.isEndBlock()){
            var parent = previousAst.getParent();
            if(!previousAst.isRoot() && previousNode.isBlock()) {
                return parent.getParent();
            } else {
                return parent;
            }
        } else {
            return previousAst.getParent() ? previousAst.getParent() : this.documetAstNode;
        }
    }

    this.getPreviousSibling = function(row, column) {
        var astNode, first = false;
        this.reverseTraverse({row : 0, column : 0}, {row : row, column : column}, 
            function(_astNode, tokenRow, tokenColumn, lastEmptyLine) {
                if(lastEmptyLine === -1 && first === false) {
                    first = true;
                } else {
                    astNode = _astNode;
                    return true;
                }
        });
        return astNode ? astNode : this.documetAstNode;
    }

    /**
     * @param row position of current token
     * @param column position of current token
     */
    this.getNextSibling = function(row, column) {
        var astNode, first = false;
        var docLength = this.doc.getLength();
        var startPosition = {row : row, column : column};
        var endPosition = {row : docLength - 1, column : this.doc.getLine(docLength - 1).length};
        this.traverse(startPosition, endPosition, function(_astNode, tokenRow, tokenColumn, lastEmptyLine) {
            if(first === false) {
                first = true;
            } else {
                astNode = _astNode;
                return true;
            }
        });
        return astNode ? astNode : this.documetAstNode;
    }

    this.get = function(row, column) {
        var astNode;
        var startPosition = {row : row, column : column};
        var endPosition = {row : row, column : column};
        this.traverse(startPosition, endPosition, function(_astNode, tokenRow, tokenColumn) {
            astNode = _astNode;
            return true;
            
        });
        return astNode ? astNode : this.documetAstNode;    
    }

    /**
     * @private
     */
    this._endBlock = function(astNode, peak, stack) {
        var peakNode = peak.getNode();
        var node = astNode.getNode();
        if(peakNode/*token of documentAstNode is null*/ && 
            peakNode.getTokenValue() === node.getTokenValue()) {
            astNode.setParent(peak); // to find match node easily
            stack.pop();
            return true;
        } else {
            var processed = false, tempNode;
            if(!peakNode) {
                var children = peak.getChildren();
                for(var i = children.length - 1 ; i > -1 ; i--) {
                    tempNode = children[i].getNode();
                    if(tempNode.isBlock()) {
                        if(tempNode.getTokenValue() === node.getTokenValue()) {
                            processed = true;
                            astNode.setParent(peak);
                        }
                        break;
                    }
                }
            }
            if(!processed) {
                peak.appendChild(astNode);
            }
        }
    }

    /**
     * startPosition
     * @private
     */
    this._insertText = function(currentRow, startPosition, endPosition, nodeList, tokens) {
        var dirtyFrom = tokens.length, dirtyTo = tokens.length, tempLength = 0, astNode;

        if(startPosition.row === endPosition.row) {
            //
            // compute dirty range
            for(var j = 0 ; j < tokens.length ; j++) {
                tempLength += tokens[j].value.length;
                if(tempLength > startPosition.column && dirtyFrom == tokens.length) {
                    dirtyFrom = j;
                }
                if(tempLength > endPosition.column && dirtyTo == tokens.length) {
                    dirtyTo = j ;
                }
            }

//            //
//            // find dirty astNode
//            astNode = this.traverse(startPosition, endPosition, function(_astNode, row, col) {
//                if(col >= startPosition.column) {
//                    return true;
//                }
//            });
//
//            //
//            // If new one type is same with type of dirty one. just change the values. it is special case.
//            if(astNode && astNode.getNode().getType() === tokens[dirtyFrom].type) {
//                //
//                // copy value
//                astNode.getNode().token.value = tokens[dirtyFrom].value;
//                //
//                // stop reparse
//                return null;
//            } else if(astNode){
//                //
//                // remove astNode
//                astNode.getParent().removeChild(astNode);
//                nodeList.removeAt(dirtyFrom);
//            }

        } else if(currentRow === startPosition.row) {
            //
            // compute dirty range¡
            for(var j = 0 ; j < tokens.length ; j++) {
                tempLength += tokens[j].value.length;
                if(tempLength > startPosition.column && dirtyFrom == -1) {
                    dirtyFrom = j;
                    break;
                }
            }

        } else if(currentRow === endPosition.row) {
            //
            // compute dirty range
            for(var j = 0 ; j < tokens.length ; j++) {
                tempLength += tokens[j].value.length;
                if(tempLength > endPosition.column && dirtyFrom == -1) {
                    dirtyFrom = j;
                    break;
                }
            }


        }

        return {from : dirtyFrom, to : dirtyTo};
    }

    /**
     * Remove dirty range and notify a changes
     * @return {from : dirtyFrom, to : dirtyTo}
     * @private
     */
    this._removeText = function(currentRow, startPosition, endPosition, nodeList, tokens) {
        var dirtyFrom = -1, dirtyTo = tokens.length, tempLength = 0;

        var len = nodeList.size();
        if(startPosition.row === endPosition.row) {
            var from = null;
            //
            // compute dirty range
            for(var j = 0 ; j < len ; j++) {
                tempLength += nodeList.get(j).getNode().getTokenLength();
                if(tempLength > startPosition.column && from == null) {
                    from = j;
                    dirtyFrom = from;
                } else if(tempLength > endPosition.column) {
                    dirtyTo = j + 1;
                    break;
                }
            }

            if(from != null) {
                //
                // remove from list.
                var removed = nodeList.removeAt(dirtyFrom, dirtyTo);
                //
                // remove from tree
                for(var  i = 0 ; i < removed.length ; i++) {
                    removed[i].getParent().removeChild(removed[i]);
                }
                this._emit("changed", {event : "remove", object : removed});
            }

        } else if(currentRow === startPosition.row) {
            var from = len, to = -1;
            for(var j = 0 ; j < len ; j++) {
                tempLength += nodeList.get(j).getNode().getTokenLength();
                if(tempLength > startPosition.column) {
                    if(dirtyFrom == -1) {
                        dirtyFrom = j;
                    }
                    from = Math.min(j, from);
                    to = Math.max(j, to);
                }
            }
            this._emit("changed", {event : "remove", object : nodeList.removeAt(from, to)});
        } else if(currentRow === endPosition.row) {
            var sum = 0;
            for(var j = 0 ; j < len ; j++) {
                sum += nodeList.get(j).getNode().getTokenLength();
            }
            var from = len, to = -1;
            for(var j = len - 1 ; j > - 1 ; j--) {
                tempLength += nodeList.get(j).getNode().getTokenLength();
                if(sum - tempLength <= endPosition.column) {
                    if(dirtyFrom == -1) {
                        dirtyFrom = j;
                    }
                    from = Math.min(j, from);
                    to = Math.max(j, to);
                }
            }

            this._emit("changed", {event : "remove", object : nodeList.removeAt(from, to)});
        }
        return {from : dirtyFrom, to : dirtyTo};
    }

    this._clearDirty = function(currentRow, action, startPosition, endPosition, nodeList, tokens) {
        if(action === "insertText") {
            var info = this._insertText(currentRow, startPosition, endPosition, nodeList, tokens);
            
            return info;
        } else if(action === "insertLines") {

        } else if (action === "removeLines") {
            this._emit("changed", {event : "remove", object : nodeList.removeAt(0, nodeList.size())});
            return {from : 0, to : token.length};
        } else if (action === "removeText") {
            return this._removeText(currentRow, startPosition, endPosition, nodeList, tokens);
        }
    }

    /**
     *
     * @param startPosition : {row, column}
     * @param endPosition : {row, column}
     */
    this.partialParse = function(startPosition, endPosition, action) {
        var nodeList, tokens, token, astNode, peak, text, dirtyInfo,
        c // sum of column length
        ;

        var parentAstNode = new InsertAwareMustacheAST(this.getParent(startPosition.row, startPosition.column), this.get(startPosition.row, startPosition.column));

        //keep track token of block type
        var stack = [parentAstNode]; 

        for(var i = startPosition.row ; i <= endPosition.row ; i++) {

            nodeList = this.list.get(i);

            if(!nodeList) {
                nodeList = new NodeList();
                this.list.insertAt(i, nodeList);
            }

            text = this.doc.getLine(i);
            tokens = this.tokenizer.getLineTokens(text).tokens;

            c = 0;

            if(!(dirtyInfo = this._clearDirty(i, action, startPosition, endPosition, nodeList, tokens))) {
                continue;
            }
debugger;
            for(var j = dirtyInfo.from ; j < dirtyInfo.to; j++) {

                token = tokens[j];

                if(!token) {
                    continue;
                }

                astNode = new MustacheAST(new MustacheNode(token));
                //
                // to debug
                astNode.r = i;
                astNode.c = j;

                nodeList.add(astNode);
                peak = stack[stack.length - 1];

                if(!peak) {
                    peak = new InsertAwareMustacheAST(this.getParent(i, c), this.get(i, c));
                    stack.push(peak);
                }

                if(astNode.getNode().isComment()) {
                    //do nothing
                } else if(astNode.getNode().isEndBlock()) {
                    this._endBlock(astNode, peak, stack);
                } else if(astNode.getNode().isBlock()) {
                    peak.appendChild(astNode);
                    stack.push(astNode);
                } else {
                    peak.appendChild(astNode);
                }

                c += token.value.length;

                //this._emit("changed", { event : "new", object : astNode });
            }

            if(nodeList.size() === 0) {
                this.list.removeAt(i);
            }
        }
    }

    /**
     * main text event listener
     */
    this.change = function(action, range, text) {
        console.log(action, range, text);
        // this.printChangedText(range);
        this.partialParse(range.start, range.end, action);
        this.print();
    }

    this.getAstList = function() {
        return this.list;
    }

    this.getDocumentElement = function() {
        return this.documetAstNode;
    }

    this.printChangedText = function(range) {
        console.log("<changed text--------------------------------------------");
        for(var i = range.start.row ; i <= range.end.row ; i++) {
            console.log(i, this.doc.getLine(i));
        }
        console.log("-------------------------------------------->\n");
    }

    this._print = function(ast, depth) {
        var tab = []
        for(var i = 0 ; i < depth ; i++) {
            tab.push("\t");
        }
        console.log(tab.join("") + "[" + ast.getNode().token.value.replace(/^\s+|\s+$/g,'') + "]", ast.getNode().getType());
        var children = ast.getChildren();
        for(var i = 0 ; i < children.length ; i++) {
            this._print(children[i], depth+1);
        }
    }

    this.print = function() {
        console.log("<--------------------------------------------");
        var children = this.documetAstNode.getChildren();
        for(var i = 0 ; i < children.length ; i++) {
            this._print(children[i], 0);
        }
        console.log("-------------------------------------------->\n");
    }

    this.printList = function() {
        for(var i = 0 ; i < this.list.size() ; i++) {
            var group = this.list.get(i);
            if(group) {
                console.log(i, group.data);
            }
        }
    }

}).call(MustacheTokenTree.prototype);

exports.MustacheTokenTree = MustacheTokenTree;
});

