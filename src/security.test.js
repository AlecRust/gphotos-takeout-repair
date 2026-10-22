import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  symlink,
  utimes,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import run from './index.js'

let tempDir
let src
let dest

beforeEach(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  tempDir = await mkdtemp(path.join(os.tmpdir(), 'gphotos-security-'))
  src = path.join(tempDir, 'work', 'source')
  dest = path.join(tempDir, 'work', 'output')
  await mkdir(src, { recursive: true })
})

afterEach(async () => {
  vi.restoreAllMocks()
  await rm(tempDir, { recursive: true, force: true })
})

const addPhoto = async (directory, filename, title = filename) => {
  await mkdir(directory, { recursive: true })
  await writeFile(path.join(directory, filename), 'source photo')
  await writeFile(
    path.join(directory, `${filename}.json`),
    JSON.stringify({ title, photoTakenTime: { timestamp: '1700000000' } }),
  )
}

it.each([
  '../photo.jpg',
  '../../photo.jpg',
  '../output-sibling/photo.jpg',
  'nested/photo.jpg',
  '..\\photo.jpg',
  'nested\\photo.jpg',
  'C:\\photo.jpg',
  'C:photo.jpg',
  '\\\\server\\share\\photo.jpg',
  '.',
  '..',
  'photo\0.jpg',
  123,
  { filename: 'photo.jpg' },
  ['photo.jpg'],
])(
  'skips unsafe metadata title %j and continues copying safe files',
  async (title) => {
    const sentinels = [
      path.join(tempDir, 'photo.jpg'),
      path.join(tempDir, 'work', 'photo.jpg'),
      path.join(tempDir, 'work', 'output-sibling', 'photo.jpg'),
    ]
    for (const file of sentinels) {
      await mkdir(path.dirname(file), { recursive: true })
      await writeFile(file, 'keep this file')
    }
    await addPhoto(src, 'photo.jpg', title)
    await addPhoto(src, 'safe.jpg')

    await run({ src, dest })

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Unsafe metadata title'),
    )
    expect(await readdir(dest)).toEqual(['safe.jpg'])
    expect(await readFile(path.join(dest, 'safe.jpg'), 'utf8')).toBe(
      'source photo',
    )
    for (const file of sentinels) {
      expect(await readFile(file, 'utf8')).toBe('keep this file')
    }
  },
)

it('rejects an absolute metadata title', async () => {
  const outside = path.join(tempDir, 'photo.jpg')
  await writeFile(outside, 'keep this file')
  await addPhoto(src, 'photo.jpg', outside)

  await run({ src, dest })

  expect(console.warn).toHaveBeenCalledWith(
    expect.stringContaining('Unsafe metadata title'),
  )
  expect(await readdir(dest)).toEqual([])
  expect(await readFile(outside, 'utf8')).toBe('keep this file')
})

it('does not allow metadata to escape a nested album', async () => {
  await addPhoto(path.join(src, 'album'), 'photo.jpg', '../photo.jpg')

  await run({ src, dest })

  expect(console.warn).toHaveBeenCalledWith(
    expect.stringContaining('Unsafe metadata title'),
  )
  expect(await readdir(dest, { recursive: true })).toEqual(['album'])
})

it.each([false, true])(
  'rejects a destination file symlink (dangling: %s)',
  async (dangling) => {
    const outside = path.join(tempDir, 'photo.jpg')
    if (!dangling) await writeFile(outside, 'keep this file')
    await addPhoto(src, 'photo.jpg')
    await mkdir(dest)
    await symlink(outside, path.join(dest, 'photo.jpg'))

    await expect(run({ src, dest })).rejects.toThrow('symbolic link')

    if (dangling) {
      await expect(readFile(outside)).rejects.toMatchObject({ code: 'ENOENT' })
    } else {
      expect(await readFile(outside, 'utf8')).toBe('keep this file')
    }
  },
)

it('rejects a destination album symlink before creating directories outside the output', async () => {
  const outside = path.join(tempDir, 'outside')
  await mkdir(outside)
  await writeFile(path.join(outside, 'sentinel'), 'keep this file')
  await addPhoto(path.join(src, 'album', 'nested'), 'photo.jpg')
  await mkdir(dest)
  await symlink(outside, path.join(dest, 'album'), 'dir')

  await expect(run({ src, dest })).rejects.toThrow('symbolic link')

  expect(await readdir(outside)).toEqual(['sentinel'])
  expect(await readFile(path.join(outside, 'sentinel'), 'utf8')).toBe(
    'keep this file',
  )
})

it('allows caller-selected relative paths and a symlink to the destination root', async () => {
  const rootLink = path.join(tempDir, 'output-link')
  await mkdir(dest)
  await symlink(dest, rootLink, 'dir')
  const title = "John & Sally's Wedding.00-001.JPG"
  await addPhoto(src, 'John _ Sally_s Wedding.00-001.JPG', title)

  await run({
    src: path.relative(process.cwd(), src),
    dest: path.relative(process.cwd(), rootLink),
  })

  expect(console.warn).not.toHaveBeenCalled()
  expect(await readdir(dest)).toEqual([title])
  expect(await readFile(path.join(dest, title), 'utf8')).toBe('source photo')
})

it('does not copy source media symlinks or change their targets through timestamps', async () => {
  const outside = path.join(tempDir, 'outside.jpg')
  await writeFile(outside, 'keep this file')
  await utimes(outside, 86400, 86400)
  await addPhoto(src, 'photo.jpg')
  await rm(path.join(src, 'photo.jpg'))
  await symlink(outside, path.join(src, 'photo.jpg'))

  await run({ src, dest })

  expect(console.warn).toHaveBeenCalledWith(
    expect.stringContaining('Skipping source symbolic link'),
  )
  expect(await readdir(dest)).toEqual([])
  expect(await readFile(outside, 'utf8')).toBe('keep this file')
  expect(Math.floor((await stat(outside)).mtimeMs / 1000)).toBe(86400)
})

it('does not follow source album symlinks or read symlinked metadata', async () => {
  const outside = path.join(tempDir, 'outside')
  await addPhoto(outside, 'photo.jpg')
  await symlink(outside, path.join(src, 'album'), 'dir')
  await writeFile(path.join(src, 'photo.jpg'), 'source photo')
  await symlink(
    path.join(outside, 'photo.jpg.json'),
    path.join(src, 'photo.jpg.json'),
  )

  await run({ src, dest })

  expect(console.warn).toHaveBeenCalledTimes(2)
  expect(await readdir(dest)).toEqual([])
})
