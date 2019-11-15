'use strict';



// TODO global progenitor stack
// TODO message.actor & message.target

function Message( method, args=[], progenitor=undefined ) {
    this.method     = method;
    this.args       = args;
    this.progenitor = progenitor;
}

function Actor(map) {
    let queue;

    this.call = function(method, args) {
        const msg = new Message( method, args );
        if (queue !== undefined) {
            queue.push(msg);
            return this;
        }

        queue = [ msg ];
        for (let i = 0; i< queue.length; i++) {
            const todo = queue[i];
            // TODO check duplicates & conflicts
            map[ todo.method ].apply(this, todo.args);
        }
        queue = undefined;
        return this;
    };
}

module.exports = Actor;

