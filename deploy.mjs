// npm run deploy: compila il sito e lo pubblica sul branch gh-pages del repository "origin".
// Su GitHub: Settings → Pages → Source = "Deploy from a branch", branch gh-pages, cartella / (root).
import { execSync } from 'node:child_process'
import ghpages from 'gh-pages'

function originRepo() {
  let url
  try {
    url = execSync('git remote get-url origin', { encoding: 'utf8' }).trim()
  } catch {
    throw new Error('Nessun remote "origin": collega prima il progetto al repository GitHub (git remote add origin …).')
  }
  // https://github.com/utente/repo(.git) oppure git@github.com:utente/repo(.git)
  const m = url.match(/github\.com[/:]([^/]+)\/(.+?)(?:\.git)?$/)
  if (!m) throw new Error(`Il remote origin non è un repository GitHub: ${url}`)
  return { owner: m[1], name: m[2] }
}

const repo = originRepo()
const env = {
  ...process.env,
  BASE_PATH: `/${repo.name}/`,
  VITE_GITHUB_REPO: `${repo.owner}/${repo.name}`,
}

console.log(`Build per https://${repo.owner}.github.io/${repo.name}/ …`)
execSync('npx vite build', { stdio: 'inherit', env })

await ghpages.publish('dist', {
  branch: 'gh-pages',
  nojekyll: true,
  message: `Deploy ${new Date().toISOString()}`,
})
console.log(`✓ Pubblicato: https://${repo.owner}.github.io/${repo.name}/ (attivo entro 1-2 minuti)`)
