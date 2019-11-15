'use strict';



// TODO global progenitor stack
// TODO message.actor & message.target

const globalContext = [];

function currentContext() {
    return globalContext.length === 0 ? {} : globalContext[globalContext.length-1];
}

let msgId = 0;
function Message( method, args=[], context={} ) {
    this.method     = method;
    this.args       = args;
    this.progenitor = context.message;
    this.actor      = context.actor;
    this.id         = ++msgId;
}

function makePolicy(spec = {}) {
    // only one for now
    const max = spec.max || 1;
    return function(seen) {
        if (seen.count !== undefined)
            return ++seen.count < max;
        seen.count = 0;
        return true;
    };
}

// for instanceof'ing only
function Proxy() {
}

let actorId = 0;
function Actor() {
    this.id = ++actorId;

    const I = x => x; // I combinator

    const map = {};
    const allow = {};

    this.addCall = function(name, handler, spec={}) {
        map[name] = handler;
        allow[name] = makePolicy( spec );
        return this;
    };

    this.onStart = I;
    this.onRecv  = I;
    this.onEnter = I;
    this.onLeave = I;
    this.onStop  = I;

    let queue;
    this.call = function(method, args, target) {
        const msg = new Message( method, args, currentContext() );

        this.onRecv( msg );

        if (queue !== undefined) {
            queue.push(msg);
            return this;
        }

        this.onStart();
        queue = [ msg ];
        const seen = {};
        for (let i = 0; i< queue.length; i++) {
            const todo = queue[i];

            // check if the message should be let through
            if (!seen[todo.method])
                seen[todo.method] = {};
            if (!allow[todo.method]( seen[todo.method], todo ))
                continue;

            try {
                globalContext.push( { message: todo, actor: this.id } );
                this.onEnter(todo);
                map[ todo.method ].apply(target || this, todo.args);
                this.onLeave(todo);
            } finally {
                globalContext.pop();
            }
        }
        queue = undefined;
        this.onStop();
        return this;
    };

    this.makeProxy = function(proxy=new Proxy()) {
        const me = this;
        for( let name in map ) {
            // TODO also add properties
            proxy[name] = function(...args) {
                me.call( name, args, proxy );
            };
        }
        return proxy;
    };
}


module.exports = Actor;

