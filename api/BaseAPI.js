let Sentry

if (process.client) {
  Sentry = require('@sentry/browser')
} else {
  Sentry = require('@sentry/node')
}

export class APIError extends Error {
  constructor({ request, response }, message) {
    super(message)
    Object.assign(this, { request, response })
  }
}

export class LoginError extends Error {
  constructor(ret, status) {
    super(status)
    Object.assign(this, { ret, status })
  }
}

export class SignUpError extends Error {
  constructor(ret, status) {
    super(status)
    Object.assign(this, { ret, status })
  }
}

export default class BaseAPI {
  constructor({ $axios }) {
    this.$axios = $axios
  }

  async $request(method, path, config) {
    let status = null
    let data = null

    try {
      const ret = await this.$axios.request({
        ...config,
        method,
        url: process.env.API + path
      })
      ;({ status, data } = ret)

      if (!status || !data) {
        // We're investigating some cases, with some evidence of it happening in page unload, where we don't go
        // through the exception handler, but we end up with nothing in status/data.
        console.log('Suspicious return from axios - perhaps cancelled?', ret)
      }
    } catch (e) {
      // We have seen exceptions such as "Error: timeout of 0ms exceeded".  These appear to be generated by
      // mobile browsers in response to network errors, and not respect the axios retrying.  But the network can't
      // be that bad if the Sentry reports ever get through.  So do a simple extra retry here.
      console.log('Axios error', e)

      if (e.message.match(/.*timeout.*/i)) {
        console.log('Timeout - sleep')
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Timeout.  Try again.  If it fails this time then we will throw another error.
        console.log('Timeout - retry')
        ;({ status, data } = await this.$axios.request({
          ...config,
          method,
          url: process.env.API + path
        }))
      } else if (e.message.match(/.*aborted.*/i)) {
        // We've seen requests get aborted immediately after beforeunload().  Makes sense to abort the requests
        // when you're leaving a page.  No point in rippling those errors up to result in Sentry errors.
        // Swallow these by returning a problem that never resolves.  Possible memory leak but it's a rare case.
        console.log('Aborted - ignore')
        return new Promise(function(resolve) {})
      }
    }

    // HTTP errors are real errors.
    //
    // We've sometimes seen 200 response codes with no returned data (I saw this myself on a train with flaky
    // signal).  So that's an error if it happens.
    //
    // data.ret holds the server error.
    // - 1 means not logged in, and that's ok.
    // - POSTs to session can return errors we want to handle.
    // - 999 can happen if people double-click, and we should just quietly drop it because the first click will
    //   probably do the right thing.
    // - otherwise pop up an error.
    if (
      status !== 200 ||
      !data ||
      (data.ret !== 0 &&
        !(data.ret === 1 && data.status === 'Not logged in') &&
        !(path === '/session' && method === 'POST') &&
        data.ret !== 999)
    ) {
      const retstr = data && data.ret ? data.ret : 'Unknown'
      const statusstr = data && data.status ? data.status : 'Unknown'

      Sentry.captureException(
        'API request failed ' +
          path +
          ' returned HTTP ' +
          status +
          ' ret ' +
          retstr +
          ' status ' +
          statusstr
      )

      const message = [
        'API Error',
        method,
        path,
        '->',
        `ret: ${retstr} status: ${statusstr}`
      ].join(' ')

      throw new APIError(
        {
          request: {
            path,
            method,
            headers: config.headers,
            params: config.params,
            data: config.data
          },
          response: {
            status,
            data
          }
        },
        message
      )
    }

    return data
  }

  $get(path, params = {}) {
    return this.$request('GET', path, { params })
  }

  $post(path, data) {
    return this.$request('POST', path, { data })
  }

  $postOverride(overrideMethod, path, data) {
    return this.$request('POST', path, {
      data,
      headers: {
        'X-HTTP-Method-Override': overrideMethod
      }
    })
  }

  $put(path, data) {
    return this.$postOverride('PUT', path, data)
  }

  $patch(path, data) {
    return this.$postOverride('PATCH', path, data)
  }

  $del(path, data, config = {}) {
    return this.$postOverride('DELETE', path, data)
  }
}
