'use strict';
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const actorify = require('../lib/actor.js');

describe( 'Actor', _=>{
    it( 'can call smth', done => {
        const trace = [];
        const actor = new actorify.Actor(function(txt) { trace.push(txt) } );

        actor.call( undefined, [ 42 ] );
        expect( trace ).to.deep.equal([42]);
        done();
    });

    it( 'does not loop', done => {
        let trace = [];

        const scene = {};
        scene.thomas = actorify( n => { trace.push(['thomas', n]); scene.jeremy(n-1) } );
        scene.jeremy = actorify( n => { trace.push(['jeremy', n]); scene.thomas(n-1) }, { max: 3 } );

        scene.thomas(42);
        expect( trace ).to.deep.equal( [['thomas', 42], ['jeremy', 41]] );

        trace = [];
        scene.jeremy(42);
        expect( trace ).to.deep.equal( [['jeremy', 42], ['thomas', 41], ['jeremy', 40]] );

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
});

