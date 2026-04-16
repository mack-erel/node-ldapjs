'use strict'

const net = require('net')
const tls = require('tls')
const { EventEmitter } = require('events')

/**
 * Node.js용 소켓 래퍼.
 * net.Socket / tls.Socket을 CfSocket과 동일한 인터페이스로 래핑한다.
 * client.js는 이 래퍼와 CfSocket 중 하나를 socket.js 팩토리를 통해 받는다.
 */
class NodeSocket extends EventEmitter {
  constructor (options) {
    super()
    const { hostname, port, socketPath, secure, tlsOptions = {} } = options

    this._destroyed = false
    this._socket = null
    this._forwarders = {}

    if (secure) {
      this._socket = tls.connect(port, hostname, tlsOptions)
      this._socket.once('secureConnect', () => this.emit('connect'))
    } else if (socketPath) {
      this._socket = net.connect({ path: socketPath })
      this._socket.once('connect', () => this.emit('connect'))
    } else {
      this._socket = net.connect(port, hostname)
      this._socket.once('connect', () => this.emit('connect'))
    }

    this._wireForwarding(this._socket)
  }

  /**
   * 내부 소켓에서 이벤트를 래퍼 EventEmitter로 전달한다.
   * 이름 있는 함수로 저장해두어 _clearForwarding()에서 제거할 수 있게 한다.
   */
  _wireForwarding (socket) {
    this._forwarders = {
      data: (data) => this.emit('data', data),
      error: (err) => this.emit('error', err),
      end: () => this.emit('end'),
      close: (hadError) => this.emit('close', hadError),
      timeout: () => this.emit('timeout')
    }
    socket.on('data', this._forwarders.data)
    socket.on('error', this._forwarders.error)
    socket.on('end', this._forwarders.end)
    socket.on('close', this._forwarders.close)
    socket.on('timeout', this._forwarders.timeout)
  }

  /**
   * 내부 소켓에서 전달 리스너를 모두 제거한다.
   * startTls() 시 구 소켓에서 stale 이벤트가 들어오는 것을 막는다.
   */
  _clearForwarding (socket) {
    if (!socket || !this._forwarders) return
    socket.removeListener('data', this._forwarders.data)
    socket.removeListener('error', this._forwarders.error)
    socket.removeListener('end', this._forwarders.end)
    socket.removeListener('close', this._forwarders.close)
    socket.removeListener('timeout', this._forwarders.timeout)
    this._forwarders = {}
  }

  write (data, callback) {
    return this._socket.write(data, callback)
  }

  end () {
    this._socket.end()
  }

  destroy () {
    this._destroyed = true
    this._socket.destroy()
  }

  /**
   * 기존 TCP 소켓을 TLS로 업그레이드한다 (STARTTLS 플로우).
   * 기존 소켓의 전달 리스너를 제거하고 TLS 소켓을 새로 생성한다.
   * 준비 완료 시 'connect' 이벤트를 발생시킨다.
   */
  startTls (options = {}) {
    const oldSocket = this._socket
    this._clearForwarding(oldSocket)

    const tlsSocket = tls.connect({ socket: oldSocket, ...options })

    tlsSocket.once('secureConnect', () => {
      this._socket = tlsSocket
      this._wireForwarding(tlsSocket)
      this.emit('connect')
    })

    tlsSocket.once('error', (err) => {
      this.emit('error', err)
    })

    return this
  }

  setKeepAlive (enable, delay) {
    return this._socket.setKeepAlive(enable, delay)
  }

  get writable () {
    return !!(this._socket && this._socket.writable)
  }

  get readable () {
    return !!(this._socket && this._socket.readable)
  }
}

module.exports = NodeSocket
