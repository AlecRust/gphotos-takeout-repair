import { execFile } from 'node:child_process'
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterEach, expect, it } from 'vitest'

const exec = promisify(execFile)
const cli = path.join(import.meta.dirname, 'index.js')
const options = { env: { ...process.env, NODE_ENV: 'production' } }
let tempDir

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true })
    tempDir = undefined
  }
})

it('shows CLI help', async () => {
  const { stdout } = await exec(process.execPath, [cli, '--help'], options)
  expect(stdout).toContain('--src')
  expect(stdout).toContain('--dest')
  expect(stdout).toContain('--verbose')
})

it('rejects missing required CLI arguments', async () => {
  await expect(exec(process.execPath, [cli], options)).rejects.toMatchObject({
    code: 1,
    stderr: expect.stringContaining('Missing required arguments: src, dest'),
  })
})

it('exits unsuccessfully when an output symlink would redirect a write', async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), 'gphotos-takeout-repair-'))
  const src = path.join(tempDir, 'source')
  const dest = path.join(tempDir, 'output')
  const outside = path.join(tempDir, 'outside.jpg')
  await mkdir(src)
  await mkdir(dest)
  await writeFile(outside, 'keep this file')
  await writeFile(path.join(src, 'photo.jpg'), 'source photo')
  await writeFile(
    path.join(src, 'photo.jpg.json'),
    JSON.stringify({
      title: 'photo.jpg',
      photoTakenTime: { timestamp: '1700000000' },
    }),
  )
  await symlink(outside, path.join(dest, 'photo.jpg'))

  await expect(
    exec(process.execPath, [cli, '--src', src, '--dest', dest], options),
  ).rejects.toMatchObject({
    code: 1,
    stderr: expect.stringContaining(
      'Refusing to write through a symbolic link',
    ),
    stdout: expect.not.stringContaining('Done!'),
  })
  expect(await readFile(outside, 'utf8')).toBe('keep this file')
})

it('copies a nested album through the CLI with edited content and metadata timestamps', async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), 'gphotos-takeout-repair-'))
  const src = path.join(tempDir, 'takeout export')
  const album = path.join(src, 'My album')
  const dest = path.join(tempDir, 'photo library')
  await mkdir(album, { recursive: true })
  await writeFile(path.join(album, 'photo.jpg'), 'original photo')
  await writeFile(path.join(album, 'photo-edited.jpg'), 'edited photo')
  await writeFile(path.join(album, 'video.mp4'), 'original video')
  const timestamp = 1700000000
  for (const title of ['photo.jpg', 'video.mp4']) {
    await writeFile(
      path.join(album, `${title}.json`),
      JSON.stringify({
        title,
        photoTakenTime: { timestamp: String(timestamp) },
      }),
    )
  }

  const { stdout, stderr } = await exec(
    process.execPath,
    [cli, '--src', src, '--dest', dest, '--verbose'],
    options,
  )
  expect(stderr).toBe('')
  expect(stdout).toContain('Copied photo.jpg')
  expect(stdout).toContain('Copied video.mp4')
  expect(stdout).toContain('Done!')

  const outputAlbum = path.join(dest, 'My album')
  expect((await readdir(outputAlbum)).sort()).toEqual([
    'photo.jpg',
    'video.mp4',
  ])
  for (const [name, content] of [
    ['photo.jpg', 'edited photo'],
    ['video.mp4', 'original video'],
  ]) {
    const file = path.join(outputAlbum, name)
    expect(await readFile(file, 'utf8')).toBe(content)
    expect(Math.floor((await stat(file)).mtimeMs / 1000)).toBe(timestamp)
  }
  expect(await readFile(path.join(album, 'photo.jpg'), 'utf8')).toBe(
    'original photo',
  )
})
