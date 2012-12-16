define(function(require, exports, module) {

var oop = require("../../lib/oop");

/**
 * As Token facade object, it support some utilized method for token.
 *
 * @param token
 * @constructor
 */
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
    this.getTokenValue = function(nostrip) {
        var value = this.token.value;
        if(nostrip) {
            return value;
        }
        if(this.isBlock() || this.isEndBlock()) {
            return value.replace(/{{[#^/]|}}/g, "");
        } else if(this.isSingle()) {
            return value.replace(/{|}/g, "");
        } else {
            return value;
        }
    }
    this.toString = function() {
        return this.getType() + ", " + this.token.value;
    }
}).call(MustacheNode.prototype);

//
// TODO linked list
//
var NodeList = function() {
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
}).call(NodeList.prototype);

/**
 * It is simple ast node for building a syntax tree.
 * @param node : instance of MustacheNode
 */
var MustacheAST = function(node) {
    this.node = node;
    this.parent;
    this.children = [];
};

(function() {
    this.setParent = function(parent) {
        this.parent = parent;
    }
    this.getParent = function() {
        return this.parent;
    }
    this.removeChild = function(ast) {
        for(var i = 0 ; i < this.children.length ; i++) {
            if(this.children[i] === ast) {
                this.children.splice(i, 1);
                return ;
            }
        }
    }
    this.appendChild = function(ast) {
        if(ast instanceof InsertAwareMustacheAST) {
            ast = ast.astNode;
        }
        ast.setParent(this);
        this.children.push(ast);
    }
    this.insertBefore = function(newAst, refAst) {
        if(newAst instanceof InsertAwareMustacheAST) {
            newAst = newAst.astNode;
        }
        newAst.setParent(this);
        for(var i = 0 ; i < this.children.length ; i++) {
            if(refAst === this.children[i]) {
                this.children.splice(i, 0, newAst);
                return true;
            }
        }
        return false;
    }
    /**
     * insertBefore or appendChild
     */
    this.insertChild = function(newAst, refAst) {
        if(this.insertBefore(newAst, refAst) === false) {
            this.appendChild(newAst);
        }
    }
    this.getChildren = function() {
        return this.children;
    }
    this.getNode = function() {
        return this.node;
    }
}).call(MustacheAST.prototype);

/**
 *
 * @param MustacheAST decorator
 * @param refAst : It is base siblingNode of new children.
 */
var InsertAwareMustacheAST = function(astNode, refAst) {

    if(astNode instanceof InsertAwareMustacheAST) {
        astNode = astNode.astNode;
    }

    this.astNode = astNode;
    this.parent;
    this.children = [];
    this.refAst = refAst;
};

(function() {
    this.setParent = function(parent) {
        this.astNode.setParent(parent);
    }
    this.getParent = function() {
        return this.astNode.getParent();
    }
    this.insertBefore = function(newAst, refAst) {
        return this.astNode.insertBefore(newAst, refAst);
    }
    this.insertChild = function(newAst, refAst) {
        if(this.astNode.insertBefore(newAst, refAst) === false) {
            this.astNode.appendChild(newAst);
        }
    }
    this.getChildren = function() {
        return this.astNode.getChildren();
    }
    this.getNode = function() {
        return this.astNode.getNode();
    }
    /**
     * decorated method of MustacheAST.appendChild.
     */
    this.appendChild = function(ast) {
        this.astNode.insertChild(ast, this.refAst);
    }
    this.removeChild = function(ast) {
        this.astNode.removeChild(ast);
    }
}).call(InsertAwareMustacheAST.prototype);

exports.MustacheNode = MustacheNode;
exports.NodeList = NodeList;
exports.MustacheAST = MustacheAST;
exports.InsertAwareMustacheAST = InsertAwareMustacheAST;

});