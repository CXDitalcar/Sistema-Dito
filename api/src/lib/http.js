export function json(status, body, headers = {}) {
  return {
    status,
    jsonBody: body,
    headers: {
      "Cache-Control": "no-store",
      ...headers,
    },
  }
}

export async function body(request) {
  try {
    return await request.json()
  } catch {
    return {}
  }
}
