export async function readForm(request, maxBytes) {
  if (!request.body) return new URLSearchParams();
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let length = 0;
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) return new URLSearchParams(text + decoder.decode());
    length += value.byteLength;
    if (length > maxBytes) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
}
