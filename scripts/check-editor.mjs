import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const editorRoot = join(workspaceRoot, 'packages/sprindle/editor')
const extensionsRoot = process.env.SPRINDLE_VSCODE_EXTENSIONS_DIR || join(homedir(), '.vscode', 'extensions')

try {
  const { checkEditorInstallation, editorCheckMessage } = await import('../packages/sprindle/editor/state.mjs')
  const result = checkEditorInstallation(editorRoot, extensionsRoot)
  const message = editorCheckMessage(result)
  if (message) process.stdout.write(`[sprindle:editor] ${message}\n`)
} catch {
  process.stdout.write('[sprindle:editor] Could not verify the installed Sprindle VS Code extension (comparison failed). Run pnpm setup:editor.\n')
}
