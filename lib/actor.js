'use strict';

// TODO global progenitor stack
// TODO message.actor & message.target

const globalContext = [];

function currentContext() {
    return globalContext.length === 0 ? {} : globalContext[globalContext.length-1];
}

let msgId = 0;
function Message( actor, target, args, context={} ) {
    this.id         = ++msgId;
    this.actor      = actor;
    this.target     = target;
    this.args       = args;
    this.context    = context;
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

let queue;
let actorId = 0;
const I = x => x; // I combinator

function Actor(handler, spec = {}) {
    this.id      = ++actorId;
    this.handler = handler;
    this.allow   = makePolicy( spec );
    this.onRecv  = I;
    this.onEnter = spec.onEnter || I;
    this.onLeave = spec.onLeave || I;

    const me = this;
    this.call = function(target, args) {
        const msg = new Message( me, target, args, currentContext() );

        me.onRecv( msg );

        if (queue !== undefined) {
            queue.push(msg);
            return; // TODO msg.promise()
        }

        queue = [ msg ];
        const seen = {};
        for (let i = 0; i< queue.length; i++) {
            const item  = queue[i];
            const actor = item.actor;

            // check if the message should be let through
            if (!seen[actor.id])
                seen[actor.id] = {};
            if (!actor.allow( seen[actor.id], item ))
                continue;

            try {
                globalContext.push( { message: item, actor: actor } );
                actor.onEnter(item);
                actor.handler.apply(item.target, item.args);
                actor.onLeave(item);
            } finally {
                globalContext.pop();
            }
        }
        queue = undefined;
        return; // TODO msg.promise()
    };

    this.mask = function() {
        return function(...args) {
            // `this` is context-dependent!
            me.call(this, args);
        };
    };
}

// TODO better name?
function actorify(fun, spec={}) {
    return new Actor(fun, spec).mask();
}
actorify.Actor = Actor;
actorify.Message = Message;

module.exports = actorify;

