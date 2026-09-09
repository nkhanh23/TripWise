/** Bound actual UTF-8 bytes, including chunked bodies without Content-Length. */
export async function readBoundedJson(message: Request | Response, maximumBytes: number): Promise<unknown> {
  if (Number(message.headers.get('content-length')) > maximumBytes || !message.body) throw new Error('Invalid body');
  const reader = message.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maximumBytes) throw new Error('Invalid body');
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
}
