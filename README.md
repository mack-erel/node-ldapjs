# @yrneh_jang/ldapjs

[![npm](https://img.shields.io/npm/v/@yrneh_jang/ldapjs)](https://www.npmjs.com/package/@yrneh_jang/ldapjs)

LDAP client for Node.js and **Cloudflare Workers**.

Fork of [ldapjs/node-ldapjs](https://github.com/ldapjs/node-ldapjs) with Cloudflare Workers support.

## Changes from upstream

- **Server removed**: `createServer()`, `Server`, `persistentSearch` are not included. This is a client-only package.
- **Cloudflare Workers support**: Socket layer is automatically detected at runtime. Uses `cloudflare:sockets` in CF Workers, `net`/`tls` in Node.js.
- **`@yrneh_jang/asn1`**: Fork of `@ldapjs/asn1` where `fs` is lazy-loaded so the module loads without error in CF Workers.

## Installation

```bash
npm install @yrneh_jang/ldapjs
```

## Usage

### Node.js

```javascript
const ldap = require('@yrneh_jang/ldapjs')

const client = ldap.createClient({
  url: ['ldap://127.0.0.1:389']
})

client.bind('cn=admin,dc=example,dc=com', 'secret', (err) => {
  if (err) throw err

  client.search('dc=example,dc=com', { filter: '(objectclass=*)' }, (err, res) => {
    res.on('searchEntry', (entry) => {
      console.log(entry.pojo)
    })
    res.on('end', () => client.unbind())
  })
})
```

### Cloudflare Workers

Add the following to your `wrangler.toml`:

```toml
compatibility_flags = ["nodejs_compat"]
```

Then use the same API as Node.js:

```javascript
import ldap from '@yrneh_jang/ldapjs'

export default {
  async fetch(request, env) {
    const client = ldap.createClient({
      url: ['ldap://your-ldap-server:389']
    })

    await new Promise((resolve, reject) => {
      client.bind('cn=admin,dc=example,dc=com', 'secret', (err) => {
        if (err) return reject(err)
        resolve()
      })
    })

    // ... perform LDAP operations

    client.unbind()
    return new Response('ok')
  }
}
```

## API

Refer to the [original ldapjs documentation](http://ldapjs.org) for the full client API.
Server-related APIs (`createServer`, `Server`, `persistentSearch`) are not available in this package.

## License

MIT
