'use strict'

const libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const Mplex = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const PeerInfo = require('peer-info')
const CID = require('cids')
const KadDHT = require('libp2p-kad-dht')
const defaultsDeep = require('@nodeutils/defaults-deep')
const waterfall = require('async/waterfall')
const parallel = require('async/parallel')
const Bootstrap = require('libp2p-railing')
const WS = require('libp2p-websockets')
const MulticastDNS = require('libp2p-mdns')
const bootstrapers = [
    '/ip4/52.207.244.0/tcp/10333/ipfs/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm'
]

class MyBundle extends libp2p {
    constructor(_options) {
        const defaults = {
            modules: {
                transport: [TCP,
                    new WS()
                ],
                streamMuxer: [Mplex],
                connEncryption: [SECIO],
                peerDiscovery: [Bootstrap, MulticastDNS],
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
                    bootstrap: {
                        interval: 2000,
                        enabled: true,
                        list: bootstrapers
                    }
                }
            }
        }

        super(defaultsDeep(_options, defaults))
    }
}


let node

function createNode(callback) {

    waterfall([
        (cb) => PeerInfo.create(cb),
        (peerInfo, cb) => {
            peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')
            peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0/ws')
            node = new MyBundle({
                peerInfo
            })
            console.log('Started')

            node.start(cb)
        }
    ], (err) => callback(err, node))
}


createNode((err, node) => {
    if (err) {
        return console.log(err)
    }
    // console.log(node)
    node.on('peer:discovery', (peer) => {
        // console.log('Discovered:', peer.id.toB58String())
        node.dial(peer, () => {})
    })

    node.on('peer:connect', (peer) => {
        console.log('Connected to peer:', peer.id.toB58String())

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

        node.dialProtocol(peer, '/dht-protocol', (err, conn) => {
            if (err) {
                return console.log(err)
            }
            console.log('nodeA dialed to nodeB on protocol')

            pull(pull.values(['This information is sent out encrypted to the other peer']), conn)

            // Sink, data converted from buffer to utf8 string
            pull(
                conn,
                pull.map((data) => {
                    return data.toString('utf8').replace('\n', '')
                }),
                pull.drain(console.log)
            )
        })

        // console.log('Connection established to:', peer.id.toB58String())
    })
    const cid = new CID('QmTp9VkYvnHyrqKQuFPiuZkiX9gPcqj6x5LJ1rmWuSySnL')

    node.contentRouting.provide(cid, (err) => {
        if (err) {
            throw err
        }

        console.log('Node %s is providing %s', node.peerInfo.id.toB58String(), cid.toBaseEncodedString())

        setInterval(() => {
            node.contentRouting.findProviders(cid, 5000, (err, providers) => {
                if (err) {
                    throw err
                }
                if (providers.length != 0) {
                    providers.forEach(provider => {
                        if (provider.id.toB58String() !== node.peerInfo.id.toB58String())
                            console.log('Found provider:', provider.id.toB58String())
                    });
                }

            })
        }, 3000)
    })

})