#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const fse = require('fs-extra')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

const argv = yargs(hideBin(process.argv))
  .option('src', {
    alias: 's',
    type: 'string',
    description: 'Source folder',
    demandOption: true,
  })
  .option('dest', {
    alias: 'd',
    type: 'string',
    description: 'Destination folder',
    demandOption: true,
  }).argv

const isImageFile = (filename) => {
  const ext = path.extname(filename).toLowerCase()
  return ['.jpg', '.jpeg', '.png'].includes(ext)
}

const normalizeString = (str) => {
  return str.replace(/\u0027/g, '_')
}

const copyMediaFiles = async (srcFolder, destFolder) => {
  const files = await fse.readdir(srcFolder)

  for (const file of files) {
    const filePath = path.join(srcFolder, file)
    const fileStat = await fse.stat(filePath)

    if (fileStat.isDirectory()) {
      await copyMediaFiles(filePath, path.join(destFolder, file))
      continue
    }

    if (!file.endsWith('.json')) continue

    const metadata = await fse.readJson(filePath)

    if (!metadata.title || !metadata.photoTakenTime || !metadata.photoTakenTime.timestamp) continue

    let normalizedTitle = normalizeString(metadata.title.split('.')[0])
    let candidates = files.filter((f) => {
      let normalizedFile = normalizeString(f.split('.')[0])
      return f !== file && (normalizedFile.startsWith(normalizedTitle) || normalizedTitle.startsWith(normalizedFile))
    })

    if (candidates.length === 0) continue

    const mediaFileToCopy = candidates.find((f) => f.includes('-edited')) || candidates[0]
    const srcMediaFilePath = path.join(srcFolder, mediaFileToCopy)
    let destMediaFilePath = path.join(destFolder, mediaFileToCopy)

    if (isImageFile(mediaFileToCopy)) {
      destMediaFilePath = path.join(destFolder, metadata.title)
    }

    await fse.copy(srcMediaFilePath, destMediaFilePath)

    const timestamp = new Date(metadata.photoTakenTime.timestamp * 1000)
    fs.utimesSync(destMediaFilePath, timestamp, timestamp)
    console.log(`Copied ${path.basename(destMediaFilePath)} with timestamp ${timestamp.toLocaleDateString()}`)
  }
}

const srcFolder = argv.src
const destFolder = argv.dest

fse
  .ensureDir(destFolder)
  .then(() => copyMediaFiles(srcFolder, destFolder))
  .catch((err) => console.error(err))
