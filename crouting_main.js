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
const multibase = require('multibase')
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
        // console.log('Discovered:', peer.id.toB58String())
        node.dial(peer, () => {})
    })

    node.on('peer:connect', (peer) => {
        // node.dialProtocol(peer, '/a-protocol', (err, conn) => {
        //     if (err) {
        //         throw err
        //     }
        //     pull(pull.values(['This information is sent out encrypted to the other peer']), conn)
        // })

        console.log('Connection established to:', peer.id.toB58String())
        // normal =  peer.id.toB58String("ahbsdfbahsdf")
        // Buffer.from('Bird bird bird, bird is the word!')

        // const encodedBuf = multibase.encode('base58btc', new Buffer('hey, how is it going'))
        // console.log(encodedBuf.toB58String())

        // const decodedBuf = multibase.decode(encodedBuf)
        // console.log(decodedBuf.toString())
        // console.log(encodedBuf)

        // const bs58 = require('bs58')

        // // const bytes = Buffer.from('003c176e659bea0f29a3e9bf7880c112b1b31b4dc826268187', 'hex')
        // const encodedBuf = multibase.encode('base58btc', new Buffer('hey, how is it going'))
        // const encodedBuf = multibase.encode('base16', new Buffer('hey, how is it going'))
        // const address = bs58.encode(encodedBuf)
        // console.log(address)
        // const IFPS = require('ipfs')
        // content = "hey, how is it going"
        // IPFS.files.add(Buffer.from(content), {onlyHash: true}, (err, content) =>{
        //     console.log(content)

        // })
        var mh = require('multihashes')
        var address = mh.toB58String(mh.encode(new Buffer('hey, how is it going'), 'sha2-256'))

        console.log(address)
        const cid = new CID(address)
        // const cid = new CID('QmTp9VkYvnHyrqKQuFPiuZkiX9gPcqj6x5LJ1rmWuSySnL')
        setTimeout(() => {
            node.contentRouting.findProviders(cid, 5000, (err, providers) => {
                if (err) {
                    throw err
                }
                if (providers.length != 0) {
                    // console.log('Found provider:', providers[0].id.toB58String())
                    console.log('Found provider:', providers)
                }

            })
        }, 1000)


    })


})