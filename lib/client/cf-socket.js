'use strict'

const { connect } = require('cloudflare:sockets')
const { EventEmitter } = require('events')

/**
 * Cloudflare Workers용 TCP/TLS 소켓 어댑터.
 * cloudflare:sockets의 Web Streams 기반 API를 Node.js EventEmitter 스타일로 래핑하여
 * client.js가 기대하는 data/connect/error/end/close 이벤트와 write/destroy/end 메서드를 제공한다.
 */
class CfSocket extends EventEmitter {
  constructor (options) {
    super()
    this._destroyed = false
    this._isWritable = false
    this._isReadable = false
    this._writer = null
    this._reader = null
    this._cfSocket = null

    this._connect(options)
  }

  _connect (options) {
    const { hostname, port, socketPath, secure, tlsOptions = {} } = options

    if (socketPath) {
      throw new Error('socketPath (Unix domain socket) is not supported in Cloudflare Workers')
    }

    const cfOptions = {}

    if (secure) {
      cfOptions.secureTransport = 'on'
    }
    if (tlsOptions.rejectUnauthorized === false) {
      // CF Workers는 starttls 이전 단계에서 인증서 검증 생략 옵션 없음 — 무시
    }

    this._cfSocket = connect({ hostname, port: Number(port) }, cfOptions)
    this._initSocket(this._cfSocket, true)
  }

  _initSocket (cfSocket, emitConnect) {
    if (this._reader) {
      this._reader.cancel().catch(() => {})
    }
    if (this._writer) {
      try { this._writer.releaseLock() } catch (_) {}
    }

    this._reader = cfSocket.readable.getReader()
    this._writer = cfSocket.writable.getWriter()
    this._isWritable = true
    this._isReadable = true

    cfSocket.opened
      .then(() => {
        if (emitConnect) this.emit('connect')
        this._pump()
      })
      .catch(err => {
        this.emit('error', err)
      })
  }

  async _pump () {
    try {
      while (true) {
        const { done, value } = await this._reader.read()
        if (done) {
          this._isReadable = false
          this.emit('end')
          this.emit('close', false)
          break
        }
        this.emit('data', Buffer.from(value))
      }
    } catch (err) {
      if (!this._destroyed) {
        this.emit('error', err)
        this.emit('close', true)
      }
    }
  }

  write (data, callback) {
    if (!this._writer || this._destroyed) {
      if (callback) callback(new Error('socket not writable'))
      return false
    }
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data)
    this._writer.write(buf)
      .then(() => { if (callback) callback() })
      .catch(err => {
        if (callback) callback(err)
        else this.emit('error', err)
      })
    return true
  }

  end () {
    this._isWritable = false
    if (this._writer) {
      this._writer.close().catch(() => {})
    }
    if (this._cfSocket) {
      this._cfSocket.close().catch(() => {})
    }
  }

  destroy () {
    this._destroyed = true
    this._isWritable = false
    this._isReadable = false
    if (this._reader) {
      this._reader.cancel().catch(() => {})
    }
    if (this._cfSocket) {
      this._cfSocket.close().catch(() => {})
    }
  }

  /**
   * 기존 연결을 TLS로 업그레이드한다 (STARTTLS 플로우).
   * CF Workers의 socket.startTls()를 호출하고 새 소켓으로 내부 상태를 교체한다.
   * 준비 완료 시 'connect' 이벤트를 발생시킨다.
   */
  startTls (options = {}) {
    const cfOptions = {}
    if (options.rejectUnauthorized === false) {
      // CF Workers는 별도 옵션 없음 — 무시
    }
    const tlsCfSocket = this._cfSocket.startTls(cfOptions)
    this._cfSocket = tlsCfSocket
    this._initSocket(tlsCfSocket, true)
    return this
  }

  // CF Workers는 TCP keepalive 설정 API가 없으므로 no-op
  setKeepAlive () {}

  get writable () {
    return this._isWritable && !this._destroyed
  }

  get readable () {
    return this._isReadable && !this._destroyed
  }
}

module.exports = CfSocket
