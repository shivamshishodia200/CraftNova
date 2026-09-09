/**
 * 360CRM Enterprise WebM Duration Fixer
 * Pure TypeScript EBML parser and metadata duration injector for MediaRecorder WebM blobs.
 * 
 * MediaRecorder in Chrome/Firefox emits WebM containers with missing or NaN duration metadata
 * because the duration is not known until recording is complete. This parser inspects the EBML
 * Segment Info section and inserts/overwrites the EBML Duration tag (0x4489), enabling HTML5
 * <video> players to seek accurately, load correct duration, and eliminate 0:00 playback states.
 */

export interface WebmDurationFixResult {
  blob: Blob;
  durationSeconds: number;
  fixed: boolean;
}

/**
 * Reads variable-length integer (VINT) from EBML buffer
 */
function readVint(buffer: Uint8Array, offset: number): { value: number; length: number } | null {
  if (offset >= buffer.length) return null;
  const firstByte = buffer[offset];
  let length = 0;
  let mask = 0x80;

  for (let i = 1; i <= 8; i++) {
    if ((firstByte & mask) !== 0) {
      length = i;
      break;
    }
    mask >>= 1;
  }

  if (length === 0 || offset + length > buffer.length) return null;

  let value = firstByte & (mask - 1);
  for (let i = 1; i < length; i++) {
    value = (value * 256) + buffer[offset + i];
  }

  return { value, length };
}

/**
 * Searches for a specific byte sequence in Uint8Array
 */
function findSequence(buffer: Uint8Array, sequence: number[], startOffset = 0): number {
  const targetLen = sequence.length;
  const maxSearch = buffer.length - targetLen;

  for (let i = startOffset; i <= maxSearch; i++) {
    let match = true;
    for (let j = 0; j < targetLen; j++) {
      if (buffer[i + j] !== sequence[j]) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
}

/**
 * Injects or updates EBML Duration in a WebM Blob
 * @param blob Source WebM blob from MediaRecorder
 * @param durationMs Duration in milliseconds
 */
export async function fixWebmDuration(blob: Blob, durationMs: number): Promise<Blob> {
  if (!blob || blob.size < 32 || durationMs <= 0) {
    return blob;
  }

  try {
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // EBML Header ID: [0x1A, 0x45, 0xDF, 0xA3]
    if (buffer[0] !== 0x1A || buffer[1] !== 0x45 || buffer[2] !== 0xDF || buffer[3] !== 0xA3) {
      // Not an EBML file
      return blob;
    }

    // Segment ID: [0x18, 0x53, 0x80, 0x67]
    const segmentOffset = findSequence(buffer, [0x18, 0x53, 0x80, 0x67], 0);
    if (segmentOffset === -1) return blob;

    // Segment Info ID: [0x15, 0x49, 0xA9, 0x66]
    const infoOffset = findSequence(buffer, [0x15, 0x49, 0xA9, 0x66], segmentOffset);
    if (infoOffset === -1) return blob;

    // Info length
    const infoVint = readVint(buffer, infoOffset + 4);
    if (!infoVint) return blob;

    const infoContentStart = infoOffset + 4 + infoVint.length;
    const infoContentEnd = infoContentStart + infoVint.value;

    // Search for TimecodeScale ID: [0x2A, 0xD7, 0xB1] inside Info (default: 1,000,000 ns = 1 ms)
    let timecodeScale = 1000000;
    const tcOffset = findSequence(buffer.subarray(infoContentStart, infoContentEnd), [0x2A, 0xD7, 0xB1]);
    if (tcOffset !== -1) {
      const tcVint = readVint(buffer, infoContentStart + tcOffset + 3);
      if (tcVint) {
        let val = 0;
        const valStart = infoContentStart + tcOffset + 3 + tcVint.length;
        for (let i = 0; i < tcVint.value; i++) {
          val = (val * 256) + buffer[valStart + i];
        }
        if (val > 0) timecodeScale = val;
      }
    }

    // Calculate duration in timecode scale units (typically milliseconds)
    const durationInUnits = (durationMs * 1000000) / timecodeScale;

    // Search for existing Duration ID: [0x44, 0x89] inside Info
    const durationOffset = findSequence(buffer.subarray(infoContentStart, infoContentEnd), [0x44, 0x89]);

    if (durationOffset !== -1) {
      // Overwrite existing duration tag
      const absDurationOffset = infoContentStart + durationOffset;
      const durVint = readVint(buffer, absDurationOffset + 2);

      if (durVint && (durVint.value === 4 || durVint.value === 8)) {
        const floatOffset = absDurationOffset + 2 + durVint.length;
        const view = new DataView(arrayBuffer, floatOffset, durVint.value);
        if (durVint.value === 4) {
          view.setFloat32(0, durationInUnits, false);
        } else {
          view.setFloat64(0, durationInUnits, false);
        }
        return new Blob([buffer], { type: blob.type || 'video/webm' });
      }
    }

    // If Duration ID does not exist, insert Duration tag (0x44, 0x89, 0x84, [4-byte Float32])
    const floatBuffer = new ArrayBuffer(4);
    new DataView(floatBuffer).setFloat32(0, durationInUnits, false);
    const floatBytes = new Uint8Array(floatBuffer);

    // EBML element: [0x44, 0x89, 0x84, b0, b1, b2, b3] (length = 7 bytes)
    const durationTag = new Uint8Array([0x44, 0x89, 0x84, floatBytes[0], floatBytes[1], floatBytes[2], floatBytes[3]]);

    // Rebuild buffer with injected duration tag inside Segment Info
    const beforeInfoContent = buffer.subarray(0, infoContentStart);
    const afterInfoContent = buffer.subarray(infoContentStart);

    return new Blob([beforeInfoContent, durationTag, afterInfoContent], {
      type: blob.type || 'video/webm'
    });
  } catch (err) {
    console.warn('[WebmDurationFixer] Failed to patch WebM duration:', err);
    return blob;
  }
}
