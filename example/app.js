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
app.use(Session(app))

// Create a new instance of CASAuthentication.
const cas = new Cas({
  cas_url: 'http://172.16.116.136:9091/cas',
  service_url: 'http://localhost:3000',
  cas_version: '1.0'
})

app.use(async (ctx, next) => {
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

// Unauthenticated clients will receive a 401 Unauthorized response instead of
// the JSON data.
router.get('/api', cas.block, ctx => {
  ctx.body = {
    success: true
  }
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

app.use(json())
app.use(router.routes())

app.listen(3000, _ => {
  console.log('listening on port 3000')
})
