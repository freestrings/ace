define(function(require, exports, module) {

var MustacheTokenTree = function(doc, tokenizer) {
    this.doc = doc;
    this.tokenizer = tokenizer;
};

(function() {
    this.change = function(range) {
        var start = range.start;
        var end = range.end;
        
        var text = this.doc.getLines(start.row, end.row);
        var result = this.tokenizer.getLineTokens(text);
        var tokens = result.tokens;

        for(var i = 0 ; i < tokens.length ; i++) {
            console.log(tokens[i].type, tokens[i].value);
        }
    }
}).call(MustacheTokenTree.prototype);

exports.MustacheTokenTree = MustacheTokenTree;    
});