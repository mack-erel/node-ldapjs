// Copyright 2011 Mark Cavage, Inc.  All rights reserved.

const client = require('./client')
const Attribute = require('@ldapjs/attribute')
const Change = require('@ldapjs/change')
const Protocol = require('@ldapjs/protocol')

const controls = require('./controls')
const dn = require('@ldapjs/dn')
const errors = require('./errors')
const filters = require('@ldapjs/filter')
const messages = require('./messages')
const url = require('./url')

const hasOwnProperty = (target, val) => Object.prototype.hasOwnProperty.call(target, val)

/// --- API

module.exports = {
  Client: client.Client,
  createClient: client.createClient,

  Attribute,
  Change,

  dn,
  DN: dn.DN,
  RDN: dn.RDN,
  parseDN: dn.DN.fromString,

  filters,
  parseFilter: filters.parseString,

  url,
  parseURL: url.parse
}

/// --- Export all the childrenz

let k

for (k in Protocol) {
  if (hasOwnProperty(Protocol, k)) { module.exports[k] = Protocol[k] }
}

for (k in messages) {
  if (hasOwnProperty(messages, k)) { module.exports[k] = messages[k] }
}

for (k in controls) {
  if (hasOwnProperty(controls, k)) { module.exports[k] = controls[k] }
}

for (k in filters) {
  if (hasOwnProperty(filters, k)) {
    if (k !== 'parse' && k !== 'parseString') { module.exports[k] = filters[k] }
  }
}

for (k in errors) {
  if (hasOwnProperty(errors, k)) {
    module.exports[k] = errors[k]
  }
}
