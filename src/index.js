#!/usr/bin/env node

import path from 'node:path'
import fse from 'fs-extra'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'

const isImageFile = (filename) =>
  ['.jpg', '.jpeg', '.png'].includes(path.extname(filename).toLowerCase())

// Metadata titles are filenames, never paths, on either supported path syntax.
const isSafeTitle = (title) =>
  typeof title === 'string' &&
  title.length > 0 &&
  title !== '.' &&
  title !== '..' &&
  !title.includes('\0') &&
  path.posix.basename(title) === title &&
  path.win32.basename(title) === title

const rejectDestinationSymlink = async (dest) => {
  let stat
  try {
    stat = await fse.lstat(dest)
  } catch (err) {
    if (err.code === 'ENOENT') return
    throw err
  }
  if (stat.isSymbolicLink()) {
    throw new Error(`Refusing to write through a symbolic link: ${dest}`)
  }
}

const normalizeAndRemoveExtension = (filename) => {
  const withoutExtension = path.parse(filename).name
  return withoutExtension.replace(/[\u0027\u0026]/g, '_')
}

const copyFile = async (src, dest, timestamp, verbose) => {
  await rejectDestinationSymlink(dest)
  await fse.copy(src, dest)
  await fse.utimes(dest, timestamp, timestamp)
  if (verbose) {
    console.log(
      `Copied ${path.basename(dest)} with timestamp ${timestamp.toLocaleDateString()}`,
    )
  }
}

const buildCandidates = (files, currentFile, title) => {
  const normalizedTitle = normalizeAndRemoveExtension(title)
  return files.filter((file) => {
    const normalizedFilename = normalizeAndRemoveExtension(file)
    const ext = path.extname(file).toLowerCase()
    return (
      file !== currentFile &&
      ext !== '.json' &&
      (normalizedFilename.startsWith(normalizedTitle) ||
        normalizedTitle.startsWith(normalizedFilename))
    )
  })
}

const chooseFromCandidates = (candidates, title) => {
  const extension = path.extname(title).toLowerCase()
  const editedVersion = candidates.find(
    (file) =>
      file.toLowerCase().includes(extension) && file.includes('-edited'),
  )
  if (editedVersion) return editedVersion

  const fileWithSameExtension = candidates.find((file) =>
    file.toLowerCase().includes(extension),
  )
  if (fileWithSameExtension) return fileWithSameExtension

  return candidates[0]
}

const processDir = async (srcDir, destDir, verbose) => {
  await rejectDestinationSymlink(destDir)
  await fse.ensureDir(destDir)
  const files = await fse.readdir(srcDir)

  for (const file of files) {
    const filePath = path.join(srcDir, file)
    const fileStat = await fse.stat(filePath)

    if (fileStat.isDirectory()) {
      await processDir(filePath, path.join(destDir, file), verbose)
      continue
    }

    if (!file.endsWith('.json')) continue

    const metadata = await fse.readJson(filePath)
    const { title, photoTakenTime } = metadata

    if (!title || !photoTakenTime?.timestamp) continue

    if (!isSafeTitle(title)) {
      console.warn(`⚠️ Unsafe metadata title in ${filePath}; skipping`)
      continue
    }

    const candidates = buildCandidates(files, file, title)

    if (candidates.length === 0) {
      console.warn(`⚠️ Could not determine a file to copy for ${filePath}`)
      continue
    }

    const selectedMediaFile = chooseFromCandidates(candidates, title)
    const srcMediaFilePath = path.join(srcDir, selectedMediaFile)
    let destMediaFilePath = path.join(destDir, selectedMediaFile)

    if (isImageFile(selectedMediaFile)) {
      destMediaFilePath = path.join(destDir, title)
    }

    const timestamp = new Date(photoTakenTime.timestamp * 1000)
    await copyFile(srcMediaFilePath, destMediaFilePath, timestamp, verbose)
  }
}

const setupYargs = () => {
  return yargs(hideBin(process.argv))
    .option('src', {
      alias: 's',
      type: 'string',
      description: 'Source directory',
      demandOption: true,
    })
    .option('dest', {
      alias: 'd',
      type: 'string',
      description: 'Destination directory',
      demandOption: true,
    })
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      description: 'Enable verbose output',
    })
    .parse()
}

const run = async ({ src: srcDir, dest: destDir, verbose }) => {
  console.log('🚀 Copying files...')
  await fse.ensureDir(destDir)
  // The caller may choose a symlink as the output root. Check all entries below
  // its real location so album and media symlinks cannot redirect later writes.
  const resolvedDestDir = await fse.realpath(destDir)
  await processDir(srcDir, resolvedDestDir, verbose)
  console.log('✅ Done!')
}

if (process.env.NODE_ENV !== 'test') {
  const argv = setupYargs()
  run(argv).catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
}

export default run
