import { Command, Option, OptionType, RubyCli } from '@rubykgen/rubyk-cli-maker'
import { execSync, spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { cwd } from 'process'

const cli = new RubyCli({
  name: 'rubytv',
  description: 'File generator CLI for typescript backend projects',
  version: '0.0.1',
})

const forPathsOption = Option.create({
  name: 'Fot paths',
  long: 'for-paths',
  short: 'fp',
  description: 'Define paths to turn version',
  type: OptionType.LIST,
})

const turnVersionCommand = Command.create<{
  forPaths: string[]
  type: 'patch' | 'minor' | 'major'
  message: string
  noGit: boolean
}>({
  name: 'turn-version',
  aliases: ['tv', 'v'],
  description: 'Turn version',
  options: [
    forPathsOption,
    Option.create({
      name: 'Type',
      long: 'type',
      short: 't',
      description: 'Define type',
      required: true,
      defaultValue: 'patch',
    }),
    Option.create({
      name: 'Message',
      long: 'message',
      short: 'm',
      description: 'Define a message to put in changelog',
      required: true,
    }),
    Option.create({
      name: 'No git',
      long: 'no-git',
      short: 'ng',
      type: OptionType.BOOLEAN,
      description: 'Disable git operation',
      defaultValue: false,
    }),
  ],
})

const turnNameCommand = Command.create<{
  forPaths: string[]
  name: string
}>({
  name: 'turn-name',
  aliases: ['tn', 'n'],
  description: 'Turn name',
  options: [
    forPathsOption,
    Option.create({
      name: 'Name',
      long: 'name',
      short: 'n',
      description: 'Define a new name',
      required: true,
    }),
  ],
})

const initCommand = Command.create<{
  forPaths: string[]
  interactive: boolean
}>({
  name: 'init',
  description: 'Init configuration files',
  options: [
    forPathsOption,
    Option.create({
      name: 'Interactive',
      long: 'interactive',
      short: 'it',
      type: OptionType.BOOLEAN,
      description: 'Confirmation on each operation',
      defaultValue: false,
    }),
  ],
})

turnVersionCommand.addHandler((args) => {
  const { forPaths } = args.args
  const { executionPath, workers } = args

  const initForPaths = forPaths ?? []

  if (initForPaths.length === 0) {
    initForPaths.push(executionPath)
  }

  initForPaths.forEach((initForPath) => {
    const projectPath = workers.folders.getPath(initForPath)

    const projectInitialized = workers.files.exists([
      projectPath,
      'package.json',
    ])
    const existsChangeLog = workers.files.exists([projectPath, 'CHANGELOG.md'])

    if (!projectInitialized || !existsChangeLog) {
      workers.logger.exit.error(
        ` Project ${projectPath} not initialized!`,
        'Please run init command first!',
      )
    }

    const packageJson = workers.files.read([projectPath, 'package.json'])
    const fileChangelog = workers.files.read([projectPath, 'CHANGELOG.md'])
    const actualContentChangelog = fileChangelog
      .get()
      .split('\n\n')
      .slice(1)
      .join('\n\n')

    const version = packageJson.get('version')
    const type = args.args.type
    const message = args.args.message

    const [major, minor, patch] = version.split('.')

    switch (type) {
      case 'major':
        packageJson.set(`${+major + 1}.0.0`, 'version')
        break
      case 'minor':
        packageJson.set(`${major}.${+minor + 1}.0`, 'version')
        break
      case 'patch':
        packageJson.set(`${major}.${minor}.${+patch + 1}`, 'version')
        break
    }

    fileChangelog.set(
      `# ${packageJson.get('name')}\n\n## ${packageJson.get('version')}\n\n### ${type} dump\n\n- ${message}\n\n${actualContentChangelog}`,
    )

    packageJson.save()
    fileChangelog.save()

    workers.logger.info(
      ` Version turned to ${packageJson.get('version')} in ${packageJson.path}`,
    )
  })
})

turnNameCommand.addHandler((args) => {
  const { forPaths, name } = args.args
  const { executionPath, workers } = args

  const initForPaths = forPaths ?? []

  if (initForPaths.length === 0) {
    initForPaths.push(executionPath)
  }

  initForPaths.forEach((initForPath) => {
    const projectPath = workers.folders.getPath(initForPath)

    const projectInitialized = workers.files.exists([
      projectPath,
      'package.json',
    ])
    const existsChangeLog = workers.files.exists([projectPath, 'CHANGELOG.md'])

    if (!projectInitialized || !existsChangeLog) {
      workers.logger.exit.error(
        ` Project ${projectPath} not initialized!`,
        'Please run init command first!',
      )
    }

    const packageJson = workers.files.read([projectPath, 'package.json'])
    const fileChangelog = workers.files.read([projectPath, 'CHANGELOG.md'])
    const actualContentChangelog = fileChangelog
      .get()
      .split('\n\n')
      .slice(1)
      .join('\n\n')

    const oldName = packageJson.get('name')

    packageJson.set(name, 'name')

    fileChangelog.set(
      `# ${packageJson.get('name')}\n\n${actualContentChangelog}`,
    )

    packageJson.save()
    fileChangelog.save()

    workers.logger.info(
      ` Name turned of ${oldName} to ${name} in ${packageJson.path}`,
    )
  })
})

initCommand.addHandler((args) => {
  const { forPaths } = args.args
  const { executionPath, workers } = args

  const initForPaths = forPaths ?? []

  if (initForPaths.length === 0) {
    initForPaths.push(executionPath)
  }

  initForPaths.forEach((initForPath) => {
    workers.folders.createIfNotExists([initForPath, '.rubyktv/'], {
      exitOnExists: false,
      showInfosLog: true,
    })

    const actualPath = workers.folders.getPath(cwd())
    const projectPath = workers.folders.getPath(initForPath)
    const projectInitialized = workers.files.exists([
      projectPath,
      'package.json',
    ])
    const existsChangeLog = workers.files.exists([projectPath, 'CHANGELOG.md'])

    if (!projectInitialized) {
      workers.logger.info(' Initializing npm project...')
      execSync(`cd ${projectPath} && npm init -y && cd ${actualPath}`)
    }

    const packageJson = workers.files.read([projectPath, 'package.json'])
    workers.files.create([projectPath, '.rubyktv/config.json'], {})

    if (!existsChangeLog) {
      workers.files.create(
        [projectPath, 'CHANGELOG.md'],
        `# ${packageJson.get('name')}\n\n## ${packageJson.get('version')}\n\n### Initial\n\n- Initial release`,
      )
    }
  })
})

cli.addCommand(initCommand)
cli.addCommand(turnVersionCommand)
cli.addCommand(turnNameCommand)

export default cli
