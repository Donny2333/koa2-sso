const Koa = require('koa')
const Router = require('koa-router')
const Session = require('koa-session')
const Cas = require('../')
const koaBodyparser = require('koa-bodyparser')
const json = require('koa-json')

const app = new Koa()

app.use(koaBodyparser())

// Set up an Koa session, which is required for CASAuthentication.
app.keys = ['some secret hurr']
app.use(
  Session(
    {
      key: 'super secret key' /** (string) cookie key (default is koa:sess) */,
      /** (number || 'session') maxAge in ms (default is 1 days) */
      /** 'session' will result in a cookie that expires when session/browser is closed */
      /** Warning: If a session cookie is stolen, this cookie will never expire */
      maxAge: 86400000,
      overwrite: true /** (boolean) can overwrite or not (default true) */,
      httpOnly: true /** (boolean) httpOnly or not (default true) */,
      signed: true /** (boolean) signed or not (default true) */,
      rolling: false /** (boolean) Force a session identifier cookie to be set on every response. The expiration is reset to the original maxAge, resetting the expiration countdown. default is false **/
    },
    app
  )
)

// Create a new instance of CASAuthentication.
const cas = new Cas({
  cas_url: 'http://172.16.116.136:9091/cas',
  service_url: 'http://localhost:3000',
  cas_version: '1.0'
})

app.use(async function(ctx, next) {
  let start = new Date()
  await next()
  let ms = new Date() - start
  console.log('%s %s - %s', ctx.method, ctx.url, ms)
})

const router = Router()

// Unauthenticated clients will be redirected to the CAS login and then back to
// this route once authenticated.
router.get('/app', cas.bounce, ctx => {
  ctx.body = '<html><body>Hello!</body></html>'
})

router.get('/hello', ctx => {
  ctx.body = '<html><body>Hello!</body></html>'
})

router.get('/baidu', ctx => {
  //   ctx.body = '<html><body>Hello!</body></html>'
  ctx.redirect('/app')
})

// Unauthenticated clients will receive a 401 Unauthorized response instead of
// the JSON data.
router.get('/api', cas.block, ctx => {
  ctx.body = { success: true }
})

// An example of accessing the CAS user session variable. This could be used to
// retrieve your own local user records based on authenticated CAS username.
router.get('/api/user', cas.block, ctx => {
  ctx.body = {
    cas_user: ctx.session[cas.session_name]
  }
})

// Unauthenticated clients will be redirected to the CAS login and then to the
// provided "redirectTo" query parameter once authenticated.
router.get('/authenticate', cas.bounce_redirect)

// This route will de-authenticate the client with the Koa server and then
// redirect the client to the CAS logout page.
router.get('/logout', cas.logout)

router.get('/', ctx => {
  // ignore favicon
  if (ctx.path === '/favicon.ico') return

  let n = ctx.session.views || 0
  ctx.session.views = ++n
  console.log(ctx.session)
  ctx.body = n + ' views'
})

app.use(json())
app.use(router.routes())

app.listen(3000, _ => {
  console.log('listening on port 3000')
})
