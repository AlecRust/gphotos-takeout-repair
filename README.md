# gphotos-takeout-repair [![CI](https://github.com/AlecRust/gphotos-takeout-repair/actions/workflows/ci.yml/badge.svg)](https://github.com/AlecRust/gphotos-takeout-repair/actions/workflows/ci.yml) [![npm version](https://img.shields.io/npm/v/gphotos-takeout-repair.svg)](https://www.npmjs.com/package/gphotos-takeout-repair)

> Organize a Google Photos export (created with [Takeout](https://takeout.google.com/)) into a useful directory of files.

The output is a directory of files (with folder structure retained) suitable for use as a traditional photo library,
where there are no JSON files or duplicate "edited" versions, and files have suitable `Date Created` timestamps.

For example given the following files in the source directory:

| Filename              | Date Created        | Description                   |
| --------------------- | ------------------- | ----------------------------- |
| `IMG_0001-edited.jpg` | Takeout export date | Edited version of the file    |
| `IMG_0001.jpg`        | Takeout export date | Original version of the file  |
| `IMG_0001.jpg.json`   | Takeout export date | Metadata information for file |
| `IMG_0002.mp4`        | Takeout export date | Original version of the file  |
| `IMG_0002.mp4.json`   | Takeout export date | Metadata information for file |

The output in the destination directory will be:

| Filename       | Date Created                 | Description                  |
| -------------- | ---------------------------- | ---------------------------- |
| `IMG_0001.jpg` | "Photo taken" date from JSON | Edited version of the file   |
| `IMG_0002.mp4` | "Photo taken" date from JSON | Original version of the file |

## Features

- Copies files to destination directory using `photoTakenTime` from the JSON file
- Copies the (usually best) "edited" version where possible to prevent duplicates
- Retains source directory folder structure to handle Takeout's exporting of albums
- Handles many common Takeout export filename and encoding issues ([view tests](./src/index.test.js))

## Requirements

- Node.js >= 20.19.x

## Install

```sh
npm install -g gphotos-takeout-repair
```

## Usage

```sh
gphotos-takeout-repair --src ./unzipped-takeout-dir --dest ./output-dir
```

## Related

- https://github.com/TheLastGimbus/GooglePhotosTakeoutHelper
- https://github.com/m1rkwood/google-photos-takeout-scripts
- https://github.com/mattwilson1024/google-photos-exif
- https://github.com/garzj/google-photos-migrate
