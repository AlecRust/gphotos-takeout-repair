#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const fse = require('fs-extra')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

const isImageFile = (filename) => {
  const ext = path.extname(filename).toLowerCase()
  return ext === '.jpg' || ext === '.jpeg' || ext === '.png'
}

const normalizeString = (str) => {
  return str.replace(/\u0027/g, '_')
}

const copyFile = async (src, dest, timestamp) => {
  await fse.copy(src, dest)
  fs.utimesSync(dest, timestamp, timestamp)
  console.log(`Copied ${path.basename(dest)} with timestamp ${timestamp.toLocaleDateString()}`)
}

const processFolder = async (srcFolder, destFolder) => {
  const files = await fse.readdir(srcFolder)

  for (const file of files) {
    const filePath = path.join(srcFolder, file)
    const fileStat = await fse.stat(filePath)

    if (fileStat.isDirectory()) {
      await processFolder(filePath, path.join(destFolder, file))
      continue
    }

    if (!file.endsWith('.json')) continue

    const metadata = await fse.readJson(filePath)
    const { title, photoTakenTime } = metadata

    if (!title || !photoTakenTime?.timestamp) continue

    const normalizedTitle = normalizeString(title.split('.')[0])
    const candidates = files.filter((f) => {
      const normalizedFile = normalizeString(f.split('.')[0])
      return f !== file && (normalizedFile.startsWith(normalizedTitle) || normalizedTitle.startsWith(normalizedFile))
    })

    if (candidates.length === 0) continue

    const mediaType = path.extname(title).toLowerCase()

    const mediaFileToCopy =
      candidates.find((f) => {
        return f.toLowerCase().includes(mediaType) && f.includes('-edited')
      }) ||
      candidates.find((f) => {
        return f.toLowerCase().includes(mediaType)
      })

    if (!mediaFileToCopy) continue

    const srcMediaFilePath = path.join(srcFolder, mediaFileToCopy)
    let destMediaFilePath = path.join(destFolder, mediaFileToCopy)

    if (isImageFile(mediaFileToCopy)) {
      destMediaFilePath = path.join(destFolder, title)
    }

    const timestamp = new Date(photoTakenTime.timestamp * 1000)
    await copyFile(srcMediaFilePath, destMediaFilePath, timestamp)
  }
}

const setupYargs = () => {
  return yargs(hideBin(process.argv))
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
}

const run = async (argv) => {
  const { src: srcFolder, dest: destFolder } = argv

  try {
    await fse.ensureDir(destFolder)
    await processFolder(srcFolder, destFolder)
  } catch (err) {
    console.error(err)
  }
}

if (require.main === module) {
  const argv = setupYargs()
  run(argv)
}

module.exports = run
