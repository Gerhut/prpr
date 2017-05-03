const Koa = require('koa')
const request = require('superagent')

const app = module.exports = new Koa()

app.use(async ctx => {
  const username = (ctx.path.match(/^\/([a-z0-9\-]+)$/i) || [])[1]
  ctx.assert(username, 400)

  const response = await request('https://api.github.com/search/issues')
    .query({
      q: `type:pr is:merged author:${username}`,
      per_page: 0xFFFF
    })

  const repository_url_set = new Set()
  for (const pullRequest of response.body.items) {
    repository_url_set.add(pullRequest.repository_url)
  }
  const repository_urls = Array.from(repository_url_set)

  const repository_responses = await Promise.all(repository_urls.map(
    repository_url => request(repository_url)
  ))
  const repositories = []
  for (const repository_response of repository_responses) {
    const repository = repository_response.body
    repositories.push({
      full_name: repository_response.body.full_name,
      stargazers_count: repository_response.body.stargazers_count
    })
  }

  repositories
    .sort((repositoryA, repositoryB) =>
      repositoryA.stargazers_count - repositoryB.stargazers_count)
    .reverse()

  ctx.body = { repositories }
})

if (require.main === module) {
  app.listen(process.env.PORT || 3000)
}
