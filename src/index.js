/*
 * Copyright (c) 2020-23 Prolincur Technologies LLP.
 * All Rights Reserved.
 */

import { Blob, FileReader } from './file-reader.js'

if (!global.Blob) global.Blob = Blob
if (!global.FileReader) global.FileReader = FileReader

export { Blob, FileReader }
