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
const SPDY = require('libp2p-spdy')
const multiaddr = require('multiaddr')
const WebRTCStar = require('libp2p-webrtc-star')

const bootstrapers = [
    '/ip4/52.207.244.0/tcp/10333/ipfs/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm',
    // '/ip4/104.236.176.52/tcp/4001/ipfs/QmSoLnSGccFuZQJzRadHn95W2CrSFmZuTdDWP8HXaHca9z',
    // '/ip4/104.236.176.52/tcp/4001/ipfs/QmSoLnSGccFuZQJzRadHn95W2CrSFmZuTdDWP8HXaHca9z',
    // '/ip4/104.236.179.241/tcp/4001/ipfs/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM',
    // '/ip4/162.243.248.213/tcp/4001/ipfs/QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnWm',
    // '/ip4/128.199.219.111/tcp/4001/ipfs/QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu',
]
const pull = require('pull-stream')
const Pushable = require('pull-pushable')
const p = Pushable()
class MyBundle extends libp2p {
    constructor(_options) {
        const wrtcStar = new WebRTCStar({
            id: _options.peerInfo.id
        })

        const defaults = {
            modules: {
                transport: [TCP,
                    new WS()
                ],
                streamMuxer: [SPDY, Mplex],
                connEncryption: [SECIO],
                peerDiscovery: [
                    MulticastDNS,
                    wrtcStar.discovery,
                    Bootstrap
                ],
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
                    },
                    webRTCStar: {
                        enabled: true
                    },
                },
                relay: { // Circuit Relay options
                    enabled: true,
                    hop: {
                        enabled: true,
                        active: true
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
            peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/10335')
            peerInfo.multiaddrs.add('/ip4/127.0.0.1/tcp/10336/ws')
            const peerIdStr = peerInfo.id.toB58String()
            const ma = `/dns4/52.207.244.0/tcp/9090/wss/p2p-webrtc-star/ipfs/${peerIdStr}`
            // "/ip4/52.207.244.0/tcp/9090/ws/p2p-webrtc-star/",
            peerInfo.multiaddrs.add(ma)
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
    console.log('Listener ready, listening on:')
    node.peerInfo.multiaddrs.forEach((ma) => {
        console.log(ma.toString())
    })
    node.on('peer:discovery', (peer) => {
        // console.log('Discovered:', peer.id.toB58String())
        node.dial(peer, () => {})
    })

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
    node.on('peer:connect', (peer) => {
        console.log('Connected to peer:', peer.id.toB58String())

        // console.log('Connection established to:', peer.id.toB58String())
    })
    // const cid = new CID('QmTp9VkYvnHyrqKQuFPiuZkiX9gPcqj6x5LJ1rmWuSySnL') //default
    // const cid = new CID("QmXGXccwT97aYp11PE3sGxDDmABWTDER1hn32dJauRSvfw") //T2.medium

    const cid = new CID('QmS7F83ss6r6acbPsKry2MKxrQqge9fesPhZKnGMJypzFY') //T2.small

    node.contentRouting.provide(cid, (err) => {
        if (err) {
            return console.log(err)
        }

        console.log('Node %s is providing %s', node.peerInfo.id.toB58String(), cid.toBaseEncodedString())



        setInterval(() => {
            node.contentRouting.findProviders(cid, 5000, (err, providers) => {
                if (err) {
                    return console.log(err)
                }
                console.log("No providers.")
                if (providers.length != 0) {
                    providers.forEach(provider => {
                        if (provider.id.toB58String() !== node.peerInfo.id.toB58String()) {
                            console.log('Found provider:', provider.id.toB58String())
                            node.dialProtocol(provider, '/dht-protocol', (err, conn) => {
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
                        }
                    });
                }

            })
        }, 5000)
    })

})