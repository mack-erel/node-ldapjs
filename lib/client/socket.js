'use strict'

/**
 * 런타임 환경을 자동 감지하여 적절한 소켓 구현을 반환하는 팩토리.
 *
 * - Node.js:              net/tls 기반 NodeSocket 사용
 * - Cloudflare Workers:   cloudflare:sockets 기반 CfSocket 사용
 *
 * nodejs_compat 플래그가 있어도 CF Workers에서는 'net' 모듈을 resolve하지 않으므로
 * try/catch require가 신뢰할 수 있는 감지 방법이다.
 */

let createSocket

try {
  const NodeSocket = require('./node-socket')
  createSocket = (options) => new NodeSocket(options)
} catch (_) {
  const CfSocket = require('./cf-socket')
  createSocket = (options) => new CfSocket(options)
}

module.exports = { createSocket }
