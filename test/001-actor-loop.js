'use strict';
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const Actor = require('../lib/actor.js');

console.log( Actor );

describe( 'Actor', _=>{
    it( 'can call smth', done => {
        const trace = [];
        const actor = new Actor()
            .addCall( 'foo', function(txt) { trace.push(txt) } );
        actor.call( "foo", [ 42 ] );
        expect( trace ).to.deep.equal([42]);
        done();
    });

    it ('does not loop', done => {
        let trace = [];
        const actor = new Actor()
            .addCall( 'foo', function(txt) {
                 trace.push(['foo', txt]); this.call( 'bar', [ txt ] );
            } )
            .addCall( 'bar', function(txt) {
                 trace.push(['bar', txt]); this.call( 'foo', [ txt ] );
            } );

        actor.call( "foo", [ 42 ] );
        expect( trace ).to.deep.equal( [["foo", 42], ["bar", 42]] );

        trace = [];
        actor.call( "bar", [ 42 ] );
        expect( trace ).to.deep.equal( [["bar", 42], ["foo", 42]] );

        done();
    });

    it( 'can have mutual relationship', done => {
        let trace = [];
        const thomas = new Actor();
        const jeremy = new Actor();

        console.log("thomas="+thomas.id+"; jeremy="+jeremy.id);

        thomas.onRecv = msg => console.log(msg);
        jeremy.onRecv = msg => console.log(msg);

        jeremy.onStart = _ => console.log("jeremy start");
        jeremy.onStop  = _ => console.log("jeremy stop");

        thomas.addCall( 'punch', str => {
            trace.push( ['thomas', str] );
            jeremy.call( 'punch', [ str ] );
        });
        jeremy.addCall( 'punch', str => {
            trace.push( ['jeremy', str] );
            thomas.call( 'punch', [ str ] );
        });

        jeremy.call( 'punch', [42] );

        expect( trace ).to.deep.equal([['jeremy', 42], ['thomas', 42]]);

        done();
    });

});

