'use strict'
/* eslint-disable no-console */

const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const Node = require('./libp2p-bundle.js')
const pull = require('pull-stream')
const Pushable = require('pull-pushable')
const p = Pushable()
const CID = require('cids')


PeerId.createFromJSON(require('./peer-id-listener'), (err, idListener) => {
    if (err) {
        throw err
    }
    const peerListener = new PeerInfo(idListener)
    peerListener.multiaddrs.add('/ip4/0.0.0.0/tcp/10333')
    const nodeListener = new Node(peerListener)

    nodeListener.start((err) => {
        if (err) {
            throw err
        }

        nodeListener.switch.on('peer-mux-established', (peerInfo) => {
            console.log(peerInfo.id.toB58String())
        })

        const cid = new CID('QmTp9VkYvnHyrqKQuFPiuZkiX9gPcqj6x5LJ1rmWuSySnL')

        
        nodeListener.contentRouting.provide(cid, (err) => {
            if (err) {
                throw err
            }
            console.log('Node %s is providing %s', nodeListener.peerInfo.id.toB58String(), cid.toBaseEncodedString())

            nodeListener.contentRouting.findProviders(cid, 5000, (err, providers) => {
                if (err) {
                    throw err
                }
                if (providers) {
                    // console.log('Found provider:', providers[0].id.toB58String())
                    console.log('Found provider:', providers)
                }

            })
        })

        nodeListener.handle('/iagon/1.0.0', (protocol, conn) => {
            pull(
                p,
                conn
            )

            pull(
                conn,
                pull.map((data) => {
                    return data.toString('utf8').replace('\n', '')
                }),
                pull.drain(console.log)
            )

            process.stdin.setEncoding('utf8')
            process.openStdin().on('data', (chunk) => {
                var data = chunk.toString()
                p.push(data)
            })
        })

        console.log('Listener ready, listening on:')
        peerListener.multiaddrs.forEach((ma) => {
            console.log(ma.toString() + '/ipfs/' + idListener.toB58String())
        })
    })
})