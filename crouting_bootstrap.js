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
const MulticastDNS = require('libp2p-mdns')
const defaultsDeep = require('@nodeutils/defaults-deep')
// const PeerInfo = require('peer-info')

const waterfall = require('async/waterfall')
const parallel = require('async/parallel')

class MyBundle extends libp2p {
    constructor(_options) {
        const defaults = {
            modules: {
                transport: [TCP,
                    new WS()
                ],
                streamMuxer: [Mplex],
                connEncryption: [SECIO],
                peerDiscovery: [MulticastDNS],
                // we add the DHT module that will enable Peer and Content Routing
                dht: KadDHT
            },
            config: {
                dht: {
                    kBucketSize: 20
                },
                EXPERIMENTAL: {
                    dht: true
                },
                peerDiscovery: {
                    mdns: { // mdns options
                        interval: 1000, // ms
                        enabled: true
                    },
                    // bootstrap: {
                    //     interval: 2000,
                    //     enabled: true,
                    //     list: bootstrapers
                    // }
                }
            }
        }

        super(defaultsDeep(_options, defaults))
    }
}
let node


PeerId.createFromJSON(require('./peer-id-listener'), (err, idListener) => {
    if (err) {
        throw err
    }
    const peerListener = new PeerInfo(idListener)
    peerListener.multiaddrs.add('/ip4/0.0.0.0/tcp/10333')
    peerListener.multiaddrs.add('/ip4/0.0.0.0/tcp/10334/ws')

    node = new MyBundle({
        peerInfo: peerListener
    })

    node.start((err) => {
        if (err) {
            throw err
        }

        // node.switch.on('peer-mux-established', (peerInfo) => {
        //     console.log(peerInfo.id.toB58String())
        // })

        node.handle('/dht-protocol', (protocol, conn) => {
            pull(pull.values(['Request received. Hello there']), conn)

            pull(
                conn,
                pull.map((data) => {
                    return data.toString('utf8').replace('\n', '')
                }),
                pull.drain(console.log)
            )
        })

        // const cid = new CID('QmTp9VkYvnHyrqKQuFPiuZkiX9gPcqj6x5LJ1rmWuSySnL')
        // var mh = require('multihashes')
        // var address = mh.toB58String(mh.encode(new Buffer('hey, how is it going'), 'sha2-256'))

        // console.log(address)
        // const cid = new CID(address)
        const cid = new CID("QmTp9VkYvnHyrqKQuFPiuZkiX9gPcqj6x5LJ1rmWuSySnL")

        node.contentRouting.provide(cid, (err) => {
            if (err) {
                throw err
            }
            console.log('Node %s is providing %s', node.peerInfo.id.toB58String(), cid.toBaseEncodedString())

            // setInterval(() => {
            //     node.contentRouting.findProviders(cid, 5000, (err, providers) => {
            //         if (err) {
            //             throw err
            //         }
            //         if (providers.length != 0) {
            //             providers.forEach(provider => {
            //                 if (provider.id.toB58String() !== node.peerInfo.id.toB58String())
            //                     console.log('Found provider:', provider.id.toB58String())
            //                 node.dialProtocol(provider, '/dht-protocol', (err, conn) => {
            //                     if (err) {
            //                         return console.log(err)
            //                     }
            //                     console.log('nodeA dialed to nodeB on protocol')

            //                     pull(pull.values(['This information is sent out encrypted to the other peer']), conn)

            //                     // Sink, data converted from buffer to utf8 string
            //                     pull(
            //                         conn,
            //                         pull.map((data) => {
            //                             return data.toString('utf8').replace('\n', '')
            //                         }),
            //                         pull.drain(console.log)
            //                     )
            //                 })
            //             });
            //         }

            //     })
            // }, 3000)
        })

        node.on('peer:connect', (peerInfo) => {
            console.log(peerInfo.id.toB58String())
        })



        console.log('Listener ready, listening on:')
        peerListener.multiaddrs.forEach((ma) => {
            console.log(ma.toString() + '/ipfs/' + idListener.toB58String())
        })
    })
})