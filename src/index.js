#!/usr/bin/env node

import { utimesSync } from 'node:fs'
import path from 'node:path'
import fse from 'fs-extra'
import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'

const isImageFile = (filename) =>
  ['.jpg', '.jpeg', '.png'].includes(path.extname(filename).toLowerCase())

const normalizeAndRemoveExtension = (filename) => {
  const withoutExtension = path.parse(filename).name
  return withoutExtension.replace(/[\u0027\u0026]/g, '_')
}

const copyFile = async (src, dest, timestamp, verbose) => {
  await fse.copy(src, dest)
  utimesSync(dest, timestamp, timestamp)
  if (verbose) {
    console.log(
      `Copied ${path.basename(
        dest,
      )} with timestamp ${timestamp.toLocaleDateString()}`,
    )
  }
}

const buildCandidates = (files, currentFile, title) => {
  const normalizedTitle = normalizeAndRemoveExtension(title)

  return files.filter((f) => {
    const normalizedFilename = normalizeAndRemoveExtension(f)
    const ext = path.extname(f).toLowerCase()
    return (
      f !== currentFile &&
      ext !== '.json' &&
      (normalizedFilename.startsWith(normalizedTitle) ||
        normalizedTitle.startsWith(normalizedFilename))
    )
  })
}

const chooseFromCandidates = (candidates, title) => {
  const extension = path.extname(title).toLowerCase()

  const editedVersion = candidates.find(
    (f) => f.toLowerCase().includes(extension) && f.includes('-edited'),
  )
  if (editedVersion) return editedVersion

  const fileWithSameExtension = candidates.find((f) =>
    f.toLowerCase().includes(extension),
  )
  if (fileWithSameExtension) return fileWithSameExtension

  return candidates[0]
}

const processDir = async (srcDir, destDir, verbose) => {
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
    }).argv
}

const run = async (argv) => {
  const { src: srcDir, dest: destDir, verbose } = argv

  try {
    console.log('🚀 Copying files...')
    await fse.ensureDir(destDir)
    await processDir(srcDir, destDir, verbose)
    console.log('✅ Done!')
  } catch (err) {
    console.error(err)
  }
}

if (process.env.NODE_ENV !== 'test') {
  const argv = setupYargs()
  run(argv)
}

export default run
