'use strict';

// default callback
const noop = () => {};

/*
 * Message class, really dumb
 */

let runId = 0;
let msgId = 0;
function Message( actor, target, args ) {
    this.id         = runId+'.'+ ++msgId;
    this.actor      = actor;
    this.target     = target;
    this.args       = args;
    this.context    = undefined;

    const me = this;
    this.promise    = new Promise(done => {
        // squash promises
        me.resolve = arg => (arg instanceof Promise) ? arg.then(done) : done(arg);
    });
}

Message.prototype.str = function() {
    return '['+this.id+'] '
        +(this.target ? this.target + '.' : '')
        +this.actor.handler+'('
        +this.args.map(x=>JSON.stringify(x)).join(', ')
        +')';
};

const callbacks = {
    onSend: noop,
    onRecv: noop,
    onSkip: noop,
    onDone: noop,
}; // global callbacks

function GlobalState(...initial) {
    initial.forEach(callbacks.onSend);

    const stack = [];
    const queue = initial;
    const seen  = {};
    let   i     = 0;
    this.push = msg => {
        msg.context = stack[stack.length-1];
        queue.push(msg);
        callbacks.onSend(msg);
    };
    this.run = function() {
        for (; i< queue.length; i++) {
            const item  = queue[i];
            const actor = item.actor;

            // check if the message should be let through
            if (!seen[actor.id])
                seen[actor.id] = {};
            if (!actor.allow( seen[actor.id], item )) {
                item.resolve();
                callbacks.onSkip(item);
                continue;
            }

            callbacks.onRecv(item);

            try {
                stack.push( { message: item, actor: actor } );
                actor.onEnter(item);
                const ret = actor.handler.apply(item.target, item.args);
                actor.onLeave(item);
                item.resolve(ret);
            } finally {
                stack.pop();
                callbacks.onDone(item);
            }
        }
        runId++;
        msgId = 0;
    };
}

let globalState;
function propagate(msg) {
    if (globalState !== undefined) {
        globalState.push(msg);
    } else {
        globalState = new GlobalState(msg);
        try {
            globalState.run();
        } finally {
            globalState = undefined;
        }
    }

    return msg.promise;
}

/*
 *  Convert a spec object into function that returns true
 *  if message is worth processing
 */
function makePolicy(spec) {
    // only one for now
    const maxdepth = spec.maxdepth || 1;
    return function(seen) {
        if (seen.count !== undefined)
            return ++seen.count < maxdepth;
        seen.count = 0;
        return true;
    };
}

let actorId = 0;
function Actor(handler, spec = {}) {
    this.id      = ++actorId;
    this.handler = handler;
    this.allow   = makePolicy( spec );
    this.onEnter = spec.onEnter || noop;
    this.onLeave = spec.onLeave || noop;

    const me = this;

    this.proxy = function(...args) {
        const msg = new Message( me, this, args );
        return propagate(msg);
    };
}

// TODO better name?
function actorify(fun, spec) {
    return new Actor(fun, spec).proxy;
}
actorify.Actor = Actor;
actorify.Message = Message;

['onSend', 'onRecv', 'onSkip', 'onDone'].forEach(name => {
    actorify[name] = function(cb) {
        callbacks[name] = cb;
        return actorify;
    };
});

module.exports = actorify;

