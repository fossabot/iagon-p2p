'use strict'
/* eslint-disable no-console */

const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const Node = require('./libp2p-bundle')
const pull = require('pull-stream')
const async = require('async')
const Pushable = require('pull-pushable')
const p = Pushable()
const CID = require('cids')

let idListener

function createNode(callback) {
    let node

    async.waterfall([
        (cb) => PeerInfo.create(cb),
        (peerInfo, cb) => {
            peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')
            node = new Node(peerInfo)
            // node.start(cb)
            cb()
        }
    ], (err) => callback(err, node))
}


async.parallel([
    (callback) => createNode(callback),
    (callback) => {
        PeerId.createFromJSON(require('./peer-id-listener'), (err, idListener) => {
            if (err) {
                throw err
            }
            callback(null, idListener)
        })
    }
], (err, ids) => {
    if (err) throw err
    // const peerDialer = new PeerInfo(ids[0])
    // peerDialer.multiaddrs.add('/ip4/0.0.0.0/tcp/0')
    // const nodeDialer = new Node(peerDialer)

    const nodeDialer = ids[0]
    // const peerDialer = dialerNode.peerInfo.id
    const peerDialer = nodeDialer.peerInfo

    const peerListener = new PeerInfo(ids[1])
    idListener = ids[1]
    peerListener.multiaddrs.add('/ip4/127.0.0.1/tcp/10333')
    nodeDialer.start((err) => {
        if (err) {
            throw err
        }

        console.log('Dialer ready, listening on:')

        peerListener.multiaddrs.forEach((ma) => {
            console.log(ma.toString() + '/ipfs/' + idListener.toB58String())
        })

        // nodeDialer.on('peer:discovery', (peer) => {
        //     console.log('Discovered:', peer.id.toB58String())
        //     nodeDialer.dial(peer, () => {})
        // })

        nodeDialer.on('peer:connect', (peer) => {
            console.log('Connection established to:', peer.id.toB58String())
        })

        const cid = new CID('QmTp9VkYvnHyrqKQuFPiuZkiX9gPcqj6x5LJ1rmWuSySnL')
        // QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm
        setTimeout(nodeDialer.contentRouting.findProviders(cid, 5000, (err, providers) => {
            if (err) {
                throw err
            }
            if (providers) {
                // console.log('Found provider:', providers[0].id.toB58String())
                console.log('Found provider:', providers)
            }

        }), 6000)


        // nodeDialer.dial(peerListener, (err, cb) => {
        //     if (err) {
        //         throw err
        //     }


        // nodeDialer.contentRouting.provide(cid, (err) => {
        //     if (err) {
        //         throw err
        //     }
        //     console.log('Node %s is providing %s', nodeDialer.peerInfo.id.toB58String(), cid.toBaseEncodedString())



        // })

        // })

        // nodeDialer.dialProtocol(peerListener, '/iagon/1.0.0', (err, conn) => {
        //     if (err) {
        //         throw err
        //     }
        //     console.log('nodeA dialed to nodeB on protocol: /chat/1.0.0')
        //     console.log('Type a message and see what happens')
        //     // Write operation. Data sent as a buffer
        //     pull(
        //         p,
        //         conn
        //     )
        //     // Sink, data converted from buffer to utf8 string
        //     pull(
        //         conn,
        //         pull.map((data) => {
        //             return data.toString('utf8').replace('\n', '')
        //         }),
        //         pull.drain(console.log)
        //     )

        //     process.stdin.setEncoding('utf8')
        //     process.openStdin().on('data', (chunk) => {
        //         var data = chunk.toString()
        //         p.push(data)
        //     })
        // })
    })
})