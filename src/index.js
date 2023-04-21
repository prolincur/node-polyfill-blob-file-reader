import * as tmp from 'tmp'
import * as fs from 'fs'
import { Blob as NodeBlob } from 'buffer'
import EventTarget from 'eventtarget'

function getTempPath() {
  return new Promise((resolve, reject) => {
    tmp.tmpName((err, path) => {
      if (err) reject(err)
      else {
        tempFiles.add(path)
        resolve(path)
      }
    })
  })
}

function fdopen(path, flags) {
  return new Promise((resolve, reject) =>
    fs.open(path, flags, (err, fd) => {
      if (err) reject(err)
      else resolve(fd)
    })
  )
}

function fdclose(fd) {
  return new Promise((resolve, reject) =>
    fs.close(fd, (err) => {
      if (err) reject(err)
      else resolve()
    })
  )
}

function fdwriteFile(fd, path) {
  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(null, { fd })
    const reader = fs.createReadStream(path)
    reader.on('error', reject)
    reader.on('end', resolve)
    writer.on('error', reject)
    reader.pipe(writer, { end: false })
  })
}

function fdwrite(fd, str) {
  return new Promise((resolve, reject) =>
    fs.write(fd, str, (err) => {
      if (err) reject(err)
      else resolve()
    })
  )
}

function fdread(fd, size, position) {
  const buffer = Buffer.alloc(size)
  return new Promise((resolve, reject) =>
    fs.read(fd, buffer, 0, size, position, (err) => {
      if (err) reject(err)
      else resolve(buffer)
    })
  )
}

const tempFiles = new Set()
const onExit = []

process.on('exit', (code) => {
  for (const cb of onExit) cb()
  process.exit(code)
})

onExit.push(() => {
  for (const file of tempFiles) {
    fs.unlinkSync(file)
  }
})

class VBlob {
  _write(fn) {
    this._writeTask = this._writeTask.then(async (fd) => {
      if (!fd) {
        this._path = await getTempPath()
        fd = await fdopen(this._path, 'w+')
      }
      await fn(fd)
      return fd
    })
  }

  _writeEnd() {
    this._writeTask = this._writeTask.then((fd) => fdclose(fd)).then(() => 0)
  }

  constructor(array, options) {
    this._path = ''
    this._offset = 0
    this._writeTask = Promise.resolve(0)
    this._type = (options && options.type) || ''
    if (!array) {
      this._path = ''
      this._size = 0
    } else {
      var size = 0
      for (const value of array) {
        if (value instanceof ArrayBuffer) {
          if (value.byteLength === 0) continue
          this._write((fd) => fdwrite(fd, new Uint8Array(value)))
          size += value.byteLength
        } else if (value instanceof Uint8Array) {
          if (value.byteLength === 0) continue
          this._write((fd) => fdwrite(fd, value))
          size += value.byteLength
        } else if (
          value instanceof Int8Array ||
          value instanceof Uint8ClampedArray ||
          value instanceof Int16Array ||
          value instanceof Uint16Array ||
          value instanceof Int32Array ||
          value instanceof Uint32Array ||
          value instanceof Float32Array ||
          value instanceof Float64Array ||
          value instanceof DataView
        ) {
          if (value.byteLength === 0) continue
          this._write((fd) =>
            fdwrite(fd, new Uint8Array(value.buffer, value.byteOffset, value.byteLength))
          )
          size += value.byteLength
        } else if (value instanceof VBlob) {
          if (value._size === 0) continue
          this._write((fd) => fdwriteFile(fd, value._path))
          size += value._size
        } else {
          const str = value + ''
          if (str.length === 0) continue
          this._write((fd) => fdwrite(fd, str))
          size += str.length
        }
      }
      this._writeEnd()
      this._size = size
    }
  }

  get size() {
    return this._size
  }

  get type() {
    return this._type
  }

  slice(start, end, contentType) {
    if (!start) start = 0
    else if (start < 0) start = this._size + start
    if (!end) end = this._size
    if (end < 0) end = this._size - end
    else if (end >= this._size) end = this._size
    if (start >= end) return new VBlob([])
    const newblob = new VBlob()
    newblob._type = contentType || this._type
    newblob._writeTask = this._writeTask
    newblob._offset = this._offset + start
    newblob._size = end - start
    this._writeTask.then(() => (newblob._path = this._path))
    return newblob
  }

  readBuffer(fd) {
    return fdread(fd, this._size, this._offset).then((buffer) => buffer.buffer)
  }
}

class VFileReader extends EventTarget {
  constructor() {
    super()
    this.EMPTY = 0
    this.LOADING = 1
    this.DONE = 2
    this.onabort = null
    this.onerror = null
    this.onload = null
    this.onloadstart = null
    this.onloadend = null
    this.onprogress = null
    this._abort = null
    this._abortPromise = null
    this.error = null
    this._readyState = 0
  }

  get readyState() {
    return this._readyState
  }

  abort() {
    if (this._abort !== null) {
      this._abort()
      this._abort = null
      this._abortPromise = null
      this.dispatchEvent({ type: 'abort' })
    }
    if (this._readyState === 1) {
      this._finishWork()
    }
  }

  _startWork(methodName) {
    if (this._readyState === 1) {
      throw Error(
        `Failed to execute '${methodName}' on 'FileReader': The object is already busy reading Blobs.`
      )
    }
    this.result = null
    this.error = null
    this._readyState = 1
    const aborted = { aborted: false }
    if (this._abortPromise === null) {
      this._abortPromise = new Promise((resolve) => {
        this._abort = () => {
          aborted.aborted = true
          resolve(null)
        }
      })
    }
    return aborted
  }

  _finishWork() {
    this.dispatchEvent({ type: 'loadend' })
    this._readyState = 2
  }

  _readBuffer(methodName, blob, cb) {
    const aborted = this._startWork(methodName)
    if (!(blob instanceof VBlob) && !(blob instanceof NodeBlob)) {
      throw TypeError(`vblob cannot handle the ${blob.constructor.name} class.`)
    }
    const prom = new Promise((resolve) => process.nextTick(resolve)).then(() => {
      if (aborted.aborted) return null
      this.dispatchEvent({ type: 'loadstart' })
      if (blob instanceof VBlob) {
        return this._readVBlob(blob)
      } else if (blob instanceof NodeBlob) {
        return this._readNodeBlob(blob)
      } else {
        return null
      }
    })
    return Promise.race([this._abortPromise, prom]).then(
      (data) => {
        if (data === null) return
        if (aborted.aborted) return
        this.result = cb(data)
        this.dispatchEvent({ type: 'load' })
        this._finishWork()
      },
      (err) => {
        if (aborted.aborted) return
        this.error = err
        this.dispatchEvent({
          type: 'error',
          message: err ? err.message : 'Error',
        })
        this._finishWork()
      }
    )
  }

  async _readVBlob(blob) {
    if (blob._size === 0) {
      return Buffer.alloc(0)
    } else {
      await blob._writeTask
      const fd = await fdopen(blob._path, 'r')
      try {
        return await fdread(fd, blob._size, blob._offset)
      } finally {
        fdclose(fd)
      }
    }
  }

  async _readNodeBlob(blob) {
    const buf = await blob.arrayBuffer()
    return Buffer.from(buf)
  }

  readAsArrayBuffer(blob) {
    this._readBuffer('readAsArrayBuffer', blob, (data) => data.buffer)
  }

  readAsBinaryString(blob) {
    this._readBuffer('readAsBinaryString', blob, (data) => data.toString('binary'))
  }

  readAsDataURL(blob) {
    this._readBuffer(
      'readAsDataURL',
      blob,
      (data) =>
        'data:' + (blob.type || 'application/octet-stream') + ';base64,' + data.toString('base64')
    )
  }

  readAsText(blob) {
    this._readBuffer('readAsText', blob, (data) => data.toString())
  }
}

const Blob = global.Blob || VBlob
const FileReader = global.FileReader || VFileReader

export { Blob, FileReader }
