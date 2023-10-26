const mockFs = require('mock-fs')
const fs = require('fs')
const path = require('path')
const run = require('./index')

describe('Tests', () => {
  let originalLog

  beforeEach(() => {
    originalLog = console.log
    console.log = jest.fn() // Hide main script console.log output
  })

  afterEach(() => {
    console.log = originalLog // Restore console.log output
  })

  it('copies file with timestamp', async () => {
    await runTest(
      [
        { name: 'IMG_0001.jpg' },
        {
          name: 'IMG_0001.jpg.json',
          content: {
            title: 'IMG_0001.jpg',
            photoTakenTime: {
              timestamp: '86400',
            },
          },
        },
      ],
      [
        {
          name: 'IMG_0001.jpg',
          timestamp: '86400',
        },
      ],
    )
  })

  it('ignores extension casing', async () => {
    await runTest(
      [
        { name: 'IMG_0001.JPG' },
        {
          name: 'IMG_0001.JPG.json',
          content: {
            title: 'IMG_0001.JPG',
            photoTakenTime: {
              timestamp: '86400',
            },
          },
        },
      ],
      [
        {
          name: 'IMG_0001.JPG',
          timestamp: '86400',
        },
      ],
    )
  })

  it('handles duplicate extensions', async () => {
    await runTest(
      [
        { name: 'IMG_0001.JPG.jpeg' },
        {
          name: 'IMG_0001.JPG.json',
          content: {
            title: 'IMG_0001.JPG',
            photoTakenTime: {
              timestamp: '86400',
            },
          },
        },
      ],
      [
        {
          name: 'IMG_0001.JPG',
          timestamp: '86400',
        },
      ],
    )
  })

  it('handles non-image files', async () => {
    await runTest(
      [
        { name: 'IMG_0001.mp4' },
        {
          name: 'IMG_0001.mp4.json',
          content: {
            title: 'IMG_0001.mp4',
            photoTakenTime: {
              timestamp: '86400',
            },
          },
        },
      ],
      [
        {
          name: 'IMG_0001.mp4',
          timestamp: '86400',
        },
      ],
    )
  })

  it('prefers "-edited" file if available', async () => {
    await runTest(
      [
        {
          name: 'IMG_0001-edited.jpg',
          filesize: '10',
        },
        {
          name: 'IMG_0001.jpg',
          filesize: '20',
        },
        {
          name: 'IMG_0001.jpg.json',
          content: {
            title: 'IMG_0001.jpg',
            photoTakenTime: {
              timestamp: '86400',
            },
          },
        },
      ],
      [
        {
          name: 'IMG_0001.jpg',
          timestamp: '86400',
          filesize: '10',
        },
      ],
    )
  })

  it('handles filename apostrophe replacement', async () => {
    await runTest(
      [
        { name: 'John Doe_s File.jpg' },
        {
          name: 'John Doe_s File.jpg.json',
          content: {
            title: 'John Doe\u0027s File.jpg',
            photoTakenTime: {
              timestamp: '86400',
            },
          },
        },
      ],
      [
        {
          name: "John Doe's File.jpg",
          timestamp: '86400',
        },
      ],
    )
  })

  it('handles poorly matching filenames', async () => {
    await runTest(
      [
        { name: 'A06B71E0-9D3A-4FF5-A391-FF3DA032E23F-2783-00000.mov' },
        {
          name: 'A06B71E0-9D3A-4FF5-A391-FF3DA032E23F-2783-0000.json',
          content: {
            title: 'A06B71E0-9D3A-4FF5-A391-FF3DA032E23F-2783-000001F73FAE3E03.mov',
            photoTakenTime: {
              timestamp: '86400',
            },
          },
        },
      ],
      [
        {
          name: 'A06B71E0-9D3A-4FF5-A391-FF3DA032E23F-2783-00000.mov',
          timestamp: '86400',
        },
      ],
    )
  })
})

const runTest = async (inputFiles, outputFiles) => {
  // Create mock file system
  const mockFileSystemConfig = {
    '/src': inputFiles.reduce((acc, file) => {
      acc[file.name] = file.content ? JSON.stringify(file.content) : Buffer.alloc(Number(file.filesize || 0))
      return acc
    }, {}),
    '/dest': {},
  }

  mockFs(mockFileSystemConfig)

  try {
    await run({ src: '/src', dest: '/dest' })

    for (const expectedFile of outputFiles) {
      const filePath = path.join('/dest', expectedFile.name)

      // Assert file exists in /dest
      const destFiles = fs.readdirSync('/dest')
      expect(destFiles).toContain(expectedFile.name)

      // Assert timestamp if specified
      if (expectedFile.timestamp) {
        const stats = fs.statSync(filePath)
        expect(Math.floor(stats.mtimeMs / 1000)).toEqual(Number(expectedFile.timestamp))
      }

      // Assert filesize if specified
      if (expectedFile.filesize) {
        const stats = fs.statSync(filePath)
        expect(stats.size).toEqual(Number(expectedFile.filesize))
      }
    }
  } finally {
    mockFs.restore()
  }
}