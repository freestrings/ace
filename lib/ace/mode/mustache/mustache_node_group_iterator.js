define(function(require, exports, module) {
/**
 *
 * @param list NodeList of MustacheNode
 * @param start range (row, column)
 * @param end range (row, column)
 */
var MustacheNodeGroupIterator = function(list, start, end) {
    this.list = list;
    this.start = start;
    this.end = end;
};

(function() {
    this.iterate = function(func) {
        var group,
        node,
        astNode,
        c, // token position in a row
        len, // total length of a row.
        startNodeIndex; // node start index of group.

        for(var i = this.start.row ; i <= this.end.row ; i++) {
            group = this.list.get(i);
            c = 0, len = 0, startNodeIndex = -1;

            // find start node
            for(var j = 0 ; group && j < group.size() ; j++) {
                len += group.get(j).getNode().getTokenLength();
                if(this.start.row === i && len >= this.start.column) {
                    startNodeIndex = j;
                } else if(this.start.row > i) {
                    startNodeIndex = 0;
                }

                if(startNodeIndex > -1) {
                    break;
                }
            }

            for(var j = startNodeIndex ; group && j < group.size()  ; j++) {
                astNode = group.get(j);
                c += astNode.getNode().getTokenLength();

                if(func(astNode, i, j) === false) {
                    return;
                }

                if(this.end.row === i && c >= this.end.column) {
                    return;
                }
            }
        }
    }
    this.reverseIterate = function(func) {
        var group, 
        node,
        astNode,
        c, // token position in a row
        len, // total length of a row.
        startNodeIndex; // node start index of group.

        for(var i = this.end.row ; i >= this.start.row ; i--) {
            group = this.list.get(i);
            c = 0, len = 0, startNodeIndex = -1;

            // find start node
            for(var j = 0 ; group && j < group.size() ; j++) {
                len += group.get(j).getNode().getTokenLength();
                if(this.end.row === i && this.end.column > -1
                    && startNodeIndex === -1 && len >= this.end.column) {
                    startNodeIndex = j;
                } else if(this.end.row > i) {
                    startNodeIndex = group.size() - 1;
                }
            }

            for(var j = startNodeIndex ; group && j > -1  ; j--) {
                astNode = group.get(j);
                c += astNode.getNode().getTokenLength();
                if(this.start.row === i && len - c < this.start.column - 1) {
                    return;
                }
                if(func(astNode, i, j) === false) {
                    return;
                }
            }
        }
    }
}).call(MustacheNodeGroupIterator.prototype);

exports.MustacheNodeGroupIterator = MustacheNodeGroupIterator;

});