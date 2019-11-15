'use strict';



// TODO global progenitor stack
// TODO message.actor & message.target

function Message( method, args=[], progenitor=undefined ) {
    this.method     = method;
    this.args       = args;
    this.progenitor = progenitor;
}

function Actor() {
    let queue;

    const map = {};
    const policy = {};

    this.addCall = function(name, handler, spec={}) {
        map[name] = handler;
        policy[name] = spec;
        return this;
    };

    this.call = function(method, args) {
        const msg = new Message( method, args );
        if (queue !== undefined) {
            queue.push(msg);
            return this;
        }

        queue = [ msg ];
        const seen = {};
        for (let i = 0; i< queue.length; i++) {
            const todo = queue[i];
            if (seen[ todo.method ])
                continue;
            seen[ todo.method ] = true;
            map[ todo.method ].apply(this, todo.args);
        }
        queue = undefined;
        return this;
    };
}

module.exports = Actor;

