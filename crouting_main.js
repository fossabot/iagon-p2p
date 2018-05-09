'use strict'

const PeerId = require('peer-id')
const libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const WS = require('libp2p-websockets')
const Mplex = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const PeerInfo = require('peer-info')
const MulticastDNS = require('libp2p-mdns')
const CID = require('cids')
const KadDHT = require('libp2p-kad-dht')
const Railing = require('libp2p-railing')

const waterfall = require('async/waterfall')
const parallel = require('async/parallel')
const pull = require('pull-stream')

const bootstrapers = [
    '/ip4/52.207.244.0/tcp/10333/ipfs/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm'
]

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
            DHT: KadDHT,
            discovery: [new Railing(bootstrapers)]
        }
        super(modules, peerInfo)
    }
}

let node

waterfall([
    (cb) => PeerInfo.create(cb),
    (peerInfo, cb) => {
        peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')
        node = new MyBundle(peerInfo)
        node.start(cb)
    }

], (err) => {
    if (err) {
        throw err
    }

    node.on('peer:discovery', (peer) => {
        console.log('Discovered:', peer.id.toB58String())
        node.dial(peer, () => {})
    })

    node.on('peer:connect', (peer) => {
        node.dialProtocol(peer, '/a-protocol', (err, conn) => {
            if (err) { throw err }
            pull(pull.values(['This information is sent out encrypted to the other peer']), conn)
          })

        console.log('Connection established to:', peer.id.toB58String())
        const cid = new CID('QmTp9VkYvnHyrqKQuFPiuZkiX9gPcqj6x5LJ1rmWuSySnL')

        node.contentRouting.findProviders(cid, 5000, (err, providers) => {
            if (err) {
                throw err
            }
            if (providers) {
                // console.log('Found provider:', providers[0].id.toB58String())
                console.log('Found provider:', providers)
            }

        })
    })


})