'use strict'

const libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const Mplex = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const PeerInfo = require('peer-info')
const CID = require('cids')
const KadDHT = require('libp2p-kad-dht')

const waterfall = require('async/waterfall')
const parallel = require('async/parallel')

class MyBundle extends libp2p {
  constructor(peerInfo) {
    const modules = {
      transport: [new TCP()],
      connection: {
        muxer: [Mplex],
        crypto: [SECIO]
      },
      // we add the DHT module that will enable Peer and Content Routing
      DHT: KadDHT,
    }
    super(modules, peerInfo)
  }
}

function createNode(callback) {
  let node

  waterfall([
    (cb) => PeerInfo.create(cb),
    (peerInfo, cb) => {
      peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/10333')
      node = new MyBundle(peerInfo)
      node.start(cb)
    }
  ], (err) => callback(err, node))
}

parallel([
  (cb) => createNode(cb),
], (err, nodes) => {
  if (err) {
    throw err
  }

  const node1 = nodes[0]
  console.log(node1.peerInfo.id.toB58String())

  const cid = new CID('QmNxd9G9Bhi3hJnyH5iZdouRsswFxnBwT939MDjq3AapEY')

  node1.contentRouting.provide(cid, (err) => {
    if (err) {
      throw err
    }
    console.log('Node %s is providing %s', node1.peerInfo.id.toB58String(), cid.toBaseEncodedString())
  })
})