import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const desiredBranch = 'main'

const packages = [
  {
    name: '@southneuhof/spool',
    dir: 'packages/spool',
    remote: 'https://github.com/southneuhof/spool.git',
    remoteName: 'pkg-spool',
  },
  {
    name: '@southneuhof/loom',
    dir: 'packages/loom',
    remote: 'https://github.com/southneuhof/loom.git',
    remoteName: 'pkg-loom',
  },
  {
    name: '@southneuhof/sprindle',
    dir: 'packages/sprindle',
    remote: 'https://github.com/southneuhof/sprindle.git',
    remoteName: 'pkg-sprindle',
  },
  {
    name: '@southneuhof/utilities',
    dir: 'packages/utilities',
    remote: 'https://github.com/southneuhof/utilities.git',
    remoteName: 'pkg-utilities',
  },
  {
    name: '@southneuhof/sdk',
    dir: 'packages/sdk',
    remote: 'https://github.com/southneuhof/sdk.git',
    remoteName: 'pkg-sdk',
  },
]

const command = process.argv[2]

function runGit(args, options = {}) {
  const output = execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: options.capture === false ? 'inherit' : ['ignore', 'pipe', 'pipe'],
  })
  return typeof output === 'string' ? output.trim() : ''
}

function tryGit(args) {
  try {
    return runGit(args)
  } catch {
    return ''
  }
}

function ensureCleanWorkingTree() {
  const status = runGit(['status', '--short'])
  if (status) {
    throw new Error('Working tree must be clean before syncing package branches.')
  }
}

function ensureRemote(pkg) {
  const current = tryGit(['remote', 'get-url', pkg.remoteName])
  if (!current) {
    runGit(['remote', 'add', pkg.remoteName, pkg.remote], { capture: false })
    return
  }

  if (current !== pkg.remote) {
    runGit(['remote', 'set-url', pkg.remoteName, pkg.remote], { capture: false })
  }
}

function remoteHasBranch(pkg, branch) {
  return Boolean(tryGit(['ls-remote', '--heads', pkg.remoteName, branch]))
}

function detectRemoteDefaultBranch(pkg) {
  const symref = tryGit(['ls-remote', '--symref', pkg.remoteName, 'HEAD'])
  const match = symref.match(/refs\/heads\/([^\s]+)/)
  return match?.[1] || 'main'
}

function packageExists(pkg) {
  return fs.existsSync(path.join(repoRoot, pkg.dir, 'package.json'))
}

function bootstrap() {
  ensureCleanWorkingTree()

  for (const pkg of packages) {
    ensureRemote(pkg)

    if (packageExists(pkg)) {
      console.log(`ok ${pkg.dir} already present`)
      continue
    }

    const sourceBranch = remoteHasBranch(pkg, desiredBranch)
      ? desiredBranch
      : detectRemoteDefaultBranch(pkg)

    console.log(`add ${pkg.dir} from ${pkg.remoteName}#${sourceBranch}`)
    runGit(
      ['subtree', 'add', `--prefix=${pkg.dir}`, pkg.remoteName, sourceBranch, '--squash'],
      { capture: false },
    )
  }
}

function pull() {
  ensureCleanWorkingTree()

  for (const pkg of packages) {
    ensureRemote(pkg)
    if (!remoteHasBranch(pkg, desiredBranch)) {
      console.log(`skip ${pkg.dir} because ${desiredBranch} does not exist yet`)
      continue
    }

    console.log(`pull ${pkg.dir} from ${pkg.remoteName}#${desiredBranch}`)
    runGit(
      ['subtree', 'pull', `--prefix=${pkg.dir}`, pkg.remoteName, desiredBranch, '--squash'],
      { capture: false },
    )
  }
}

function pushPackages() {
  ensureCleanWorkingTree()

  for (const pkg of packages) {
    ensureRemote(pkg)
    console.log(`split ${pkg.dir}`)
    const splitSha = runGit(['subtree', 'split', `--prefix=${pkg.dir}`])
    console.log(`push ${pkg.dir} to ${pkg.remoteName}#${desiredBranch}`)
    runGit(['push', pkg.remoteName, `${splitSha}:refs/heads/${desiredBranch}`], { capture: false })
  }
}

function status() {
  for (const pkg of packages) {
    ensureRemote(pkg)
    const changed = tryGit(['status', '--short', '--', pkg.dir])
      .split('\n')
      .filter(Boolean)
      .length
    const branchExists = remoteHasBranch(pkg, desiredBranch)
    const lastCommit = tryGit(['log', '-1', '--format=%h %s', '--', pkg.dir]) || 'untracked in history'
    console.log(
      [
        pkg.dir,
        `branch=${branchExists ? desiredBranch : 'missing'}`,
        `changes=${changed}`,
        `last=${lastCommit}`,
      ].join(' | '),
    )
  }
}

function pushAll() {
  pushPackages()
  const branch = runGit(['branch', '--show-current'])
  if (!branch) {
    throw new Error('Cannot push the mirror repo from a detached HEAD.')
  }

  console.log(`push repo branch ${branch}`)
  runGit(['push', 'origin', branch], { capture: false })
}

const actions = {
  bootstrap,
  pull,
  push: pushPackages,
  status,
  'push-all': pushAll,
}

if (!command || !actions[command]) {
  throw new Error(`Usage: node scripts/package-repos.mjs <${Object.keys(actions).join('|')}>`)
}

actions[command]()
