'use strict';
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const actorify = require('../lib/actorify.js');

describe( 'Actor', _=>{
    it( 'can call smth', done => {
        const trace = [];
        const actor = new actorify.Actor(function(txt) { trace.push(txt) } );

        actor.proxy( 42 );
        expect( trace ).to.deep.equal([42]);
        done();
    });

    it( 'does not loop', done => {
        let trace = [];

        const scene = {};
        scene.thomas = actorify( n => { trace.push(['thomas', n]); scene.jeremy(n-1) } );
        scene.jeremy = actorify( n => { trace.push(['jeremy', n]); scene.thomas(n-1) }, { maxdepth: 3 } );

        scene.thomas(42);
        expect( trace ).to.deep.equal( [['thomas', 42], ['jeremy', 41]] );

        trace = [];
        scene.jeremy(42);
        expect( trace ).to.deep.equal( [['jeremy', 42], ['thomas', 41], ['jeremy', 40]] );

        done();
    });

    it( 'has onEnter and onLeave', done => {
        const trace = [];
        const obj = {};
        obj.rec = actorify( x => obj.rec(x-1), {
            maxdepth: 3,
            onEnter: msg => trace.push( [ 'enter', msg.args[0] ] ),
            onLeave: msg => trace.push( [ 'leave', msg.args[0] ] ),
        } );

        obj.rec(42);
        expect( trace ).to.deep.equal([
            ['enter', 42], ['leave', 42],
            ['enter', 41], ['leave', 41],
            ['enter', 40], ['leave', 40],
        ]);
        done();
    });

    it( 'keeps track of context in messages', done => {
        let trace = [];
        const obj = {};
        obj.rec = actorify( n => obj.rec(n-1), {
            onEnter : msg => trace.push(msg),
            maxdepth: 3,
        } );

        obj.rec(42);

        expect( trace.length ).to.equal(3);
        expect( trace[0].context ).to.equal( undefined );
        expect( trace[1].context.message ).to.equal( trace[0] );
        expect( trace[2].context.message ).to.equal( trace[1] );

        done();
    });

    it( 'can return via promise', done => {
        const squared = actorify( n => n*n );
        const prom = squared(5);
        expect( prom ).to.be.instanceof( Promise );

        prom.then( got => {
            expect( got ).to.equal(25);
            done();
        });
    });

    it( 'can return via promise II', done => {
        const obj = {foo: 0};
        obj.getFoo = actorify( _=>++obj.foo );
        obj.frobnicate = actorify( async function(x) {
            return x + await obj.getFoo();
        });

        const prom = obj.frobnicate(41);
        expect( prom ).to.be.instanceof( Promise );

        prom.then( got => {
            expect( got ).to.equal(42);
            expect( obj.foo ).to.equal(1);
            done();
        });
    });

    it ('leaves no unresolved promises', async () => {
        const trace = [];
        const obj = {};
        obj.rec = actorify( n => { trace.push(obj.rec(n-1)); return n; }
            , {maxdepth: 3} );

        expect( await obj.rec(42) ).to.equal(42);
        expect( await trace[0] ).to.equal(41);
        expect( await trace[1] ).to.equal(40);
        expect( await trace[2] ).to.equal(undefined);
    });
});

