'use strict';
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const Actor = require('../lib/actor.js');

describe( 'Actor', _=>{
    it( 'can call smth', done => {
        const trace = [];
        const actor = new Actor(function(txt) { trace.push(txt) } );

        actor.call( undefined, [ 42 ] );
        expect( trace ).to.deep.equal([42]);
        done();
    });

    it( 'does not loop', done => {
        let trace = [];

        const scene = {};
        scene.thomas = new Actor( n => { trace.push(['thomas', n]); scene.jeremy(n-1) } ).proxy();
        scene.jeremy = new Actor( n => { trace.push(['jeremy', n]); scene.thomas(n-1) }, { max: 3 } ).proxy();

        scene.thomas(42);
        expect( trace ).to.deep.equal( [['thomas', 42], ['jeremy', 41]] );

        trace = [];
        scene.jeremy(42);
        expect( trace ).to.deep.equal( [['jeremy', 42], ['thomas', 41], ['jeremy', 40]] );

        done();
    });

});

