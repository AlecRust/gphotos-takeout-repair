# gphotos-takeout-repair [![CI](https://github.com/AlecRust/gphotos-takeout-repair/actions/workflows/ci.yml/badge.svg)](https://github.com/AlecRust/gphotos-takeout-repair/actions/workflows/ci.yml) [![npm version](https://badge.fury.io/js/gphotos-takeout-repair.svg)](https://badge.fury.io/js/gphotos-takeout-repair)

> Transform a Google Photos export (created with [Takeout](https://takeout.google.com/)) into a useful directory of files.

The output is a directory of files (with folder structure retained) suitable for use as a traditional photo library, where
files have suitable `Date Created` timestamps, there are no JSON files, and no duplicate "edited" versions.

For example given the following files in the source directory:

| Filename            | Date Created        | Description                   |
| ------------------- | ------------------- | ----------------------------- |
| IMG_0001-edited.JPG | Takeout export date | Edited version of the file    |
| IMG_0001.JPG        | Takeout export date | Original version of the file  |
| IMG_0001.json       | Takeout export date | Metadata information for file |
| IMG_0002.mp4        | Takeout export date | Original version of the file  |
| IMG_0002.json       | Takeout export date | Metadata information for file |

The output in the destination directory will be:

| Filename     | Date Created                 | Description                  |
| ------------ | ---------------------------- | ---------------------------- |
| IMG_0001.JPG | "Photo taken" date from JSON | Edited version of the file   |
| IMG_0002.mp4 | "Photo taken" date from JSON | Original version of the file |

## Features

- Copies files to destination directory using timestamp from the JSON file
- Copies the (usually best) "edited" version where possible to prevent duplicates
- Retains source directory folder structure to handle Takeout's exporting of albums
- Handles some common Takeout export filename and encoding issues

## Installation

```sh
npm install -g gphotos-takeout-repair
```

## Usage

```sh
gphotos-takeout-repair --src ./unzipped-takeout-dir --dest ./output-dir
```

## Related

- https://github.com/TheLastGimbus/GooglePhotosTakeoutHelper
- https://github.com/mattwilson1024/google-photos-exif
