'use strict';

const fs = require('fs');

/** Verifica los magic bytes %PDF (RNF-04: MIME real, no el declarado por el cliente). */
function isPdfFile(filePath) {
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(4);
    const read = fs.readSync(fd, buffer, 0, 4, 0);
    return read === 4 && buffer.toString('latin1') === '%PDF';
  } catch {
    return false;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

module.exports = { isPdfFile };
