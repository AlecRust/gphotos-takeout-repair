# gphotos-takeout-repair [![CI](https://github.com/AlecRust/gphotos-takeout-repair/actions/workflows/ci.yml/badge.svg)](https://github.com/AlecRust/gphotos-takeout-repair/actions/workflows/ci.yml) [![npm version](https://badge.fury.io/js/gphotos-takeout-repair.svg)](https://badge.fury.io/js/gphotos-takeout-repair)

Transform a Google Photos export (created with [Takeout](https://takeout.google.com/)) into a more useful folder(s) of images.

The output is folder of files (with folder structure retained) suitable for use as a traditional photo library, where there are no JSON files, no "edited" versions, and the files have suitable `Date Created` timestamps.

For example the following files within the source directory:

| Filename            | Date Created        | Description                   |
| ------------------- | ------------------- | ----------------------------- |
| IMG_0001-edited.JPG | Takeout export date | Edited version of the file    |
| IMG_0001.JPG        | Takeout export date | Original version of the file  |
| IMG_0001.json       | Takeout export date | Metadata information for file |

Will result in the following file output to the destination directory:

| Filename     | Date Created                 | Description                |
| ------------ | ---------------------------- | -------------------------- |
| IMG_0001.JPG | "Photo taken" date from JSON | Edited version of the file |

## Features

- Copies files to destination directory using timestamp from the JSON file
- Selects the best version to copy i.e. "edited" version over original
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
