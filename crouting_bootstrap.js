'use strict'
/* eslint-disable no-console */

const PeerId = require('peer-id')
const libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const WS = require('libp2p-websockets')
const Mplex = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const PeerInfo = require('peer-info')
const CID = require('cids')
const KadDHT = require('libp2p-kad-dht')
const Railing = require('libp2p-railing')
const pull = require('pull-stream')

const waterfall = require('async/waterfall')
const parallel = require('async/parallel')

class MyBundle extends libp2p {
    constructor(peerInfo) {
        const modules = {
            transport: [new TCP(),
                new WS()
            ],
            connection: {
                muxer: [Mplex],
                crypto: [SECIO]
            },
            // we add the DHT module that will enable Peer and Content Routing
            DHT: KadDHT
        }
        super(modules, peerInfo)
    }
}

PeerId.createFromJSON(require('./peer-id-listener'), (err, idListener) => {
    if (err) {
        throw err
    }
    const peerListener = new PeerInfo(idListener)
    peerListener.multiaddrs.add('/ip4/0.0.0.0/tcp/10333')
    peerListener.multiaddrs.add('/ip4/0.0.0.0/tcp/10334/ws')
    const nodeListener = new MyBundle(peerListener)

    nodeListener.start((err) => {
        if (err) {
            throw err
        }

        nodeListener.switch.on('peer-mux-established', (peerInfo) => {
            console.log(peerInfo.id.toB58String())
        })

        nodeListener.handle('/a-protocol', (protocol, conn) => {
            pull(
                conn,
                pull.map((v) => v.toString()),
                pull.log()
            )
        })

        // const cid = new CID('QmTp9VkYvnHyrqKQuFPiuZkiX9gPcqj6x5LJ1rmWuSySnL')
        var mh = require('multihashes')
        var address = mh.toB58String(mh.encode(new Buffer('hey, how is it going'), 'sha2-256'))

        console.log(address)
        const cid = new CID(address)

        nodeListener.contentRouting.provide(cid, (err) => {
            if (err) {
                throw err
            }
            console.log('Node %s is providing %s', nodeListener.peerInfo.id.toB58String(), cid.toBaseEncodedString())

            // nodeListener.contentRouting.findProviders(cid, 5000, (err, providers) => {
            //     if (err) {
            //         throw err
            //     }
            //     if (providers) {
            //         // console.log('Found provider:', providers[0].id.toB58String())
            //         console.log('Found provider:', providers)
            //     }
            // })
        })

        console.log('Listener ready, listening on:')
        peerListener.multiaddrs.forEach((ma) => {
            console.log(ma.toString() + '/ipfs/' + idListener.toB58String())
        })
    })
})