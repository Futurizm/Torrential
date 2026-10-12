import type {
  AddTorrentResponse,
  RemoveTorrentResponse,
  ServerMessage,
  SettingsPayload,
  TorrentSnapshot,
} from '@shared/protocol'

const API_BASE = import.meta.env?.VITE_API_URL ?? ''

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Код из server/errors.ts — по нему UI показывает локализованный текст. */
    readonly code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}/api${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    let message = `HTTP ${response.status}`
    let code: string | undefined
    try {
      const body = (await response.json()) as { error?: string; code?: string }
      if (body.error) message = body.error
      code = body.code
    } catch {
      /* ответ без JSON — оставляем дефолтное сообщение */
    }
    throw new ApiError(message, response.status, code)
  }

  return (await response.json()) as T
}

const send = <T>(method: string, path: string, body?: unknown) =>
  request<T>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

const post = <T>(path: string, body?: unknown) => send<T>('POST', path, body)

/** Читает .torrent-файл в base64, чтобы не тянуть multipart-библиотеку. */
function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new ApiError('read failed', 0, 'invalid_torrent_file'))
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.slice(result.indexOf(',') + 1)
      resolve(base64)
    }
    reader.readAsDataURL(file)
  })
}

export const api = {
  list: () => request<{ torrents: TorrentSnapshot[] }>('/torrents'),

  addMagnet: (magnet: string) =>
    post<AddTorrentResponse>('/torrents', { magnet }).then((r) => r.torrent),

  async addFile(file: File): Promise<TorrentSnapshot> {
    const data = await toBase64(file)
    const response = await post<AddTorrentResponse>('/torrents', {
      file: { name: file.name, data },
    })
    return response.torrent
  },

  setState: (id: string, action: 'pause' | 'resume' | 'check') =>
    send<AddTorrentResponse>('PATCH', `/torrents/${id}`, { action }).then((r) => r.torrent),

  remove: (id: string, deleteFiles: boolean) =>
    request<RemoveTorrentResponse>(`/torrents/${id}${deleteFiles ? '?deleteFiles=1' : ''}`, {
      method: 'DELETE',
    }),

  selectFiles: (id: string, indices: number[]) =>
    request<AddTorrentResponse>(`/torrents/${id}/files`, {
      method: 'PUT',
      body: JSON.stringify({ indices }),
    }).then((r) => r.torrent),

  settings: () => request<SettingsPayload>('/settings'),

  saveSettings: (payload: Partial<SettingsPayload>) =>
    request<SettingsPayload>('/settings', { method: 'PUT', body: JSON.stringify(payload) }),
}

/** Единственное WebSocket-соединение на всё приложение. */
export function createSocket(handlers: {
  onMessage: (message: ServerMessage) => void
  onStatus: (status: 'connecting' | 'open' | 'closed') => void
}): { close: () => void; subscribe: (id: string) => void; unsubscribe: (id: string) => void } {
  let socket: WebSocket | null = null
  let closedByUser = false
  let retry = 0
  let timer: number | undefined

  const connect = (): void => {
    handlers.onStatus('connecting')
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
    socket = new WebSocket(`${protocol}://${location.host}/ws`)

    socket.onopen = () => {
      retry = 0
      handlers.onStatus('open')
      send({ type: 'sync' })
    }

    socket.onmessage = (event: MessageEvent<string>) => {
      try {
        handlers.onMessage(JSON.parse(event.data) as ServerMessage)
      } catch {
        /* игнорируем битые кадры */
      }
    }

    socket.onclose = () => {
      handlers.onStatus('closed')
      if (closedByUser) return
      retry += 1
      const delay = Math.min(8000, 400 * 2 ** Math.min(retry, 4))
      timer = window.setTimeout(connect, delay)
    }

    socket.onerror = () => socket?.close()
  }

  const send = (message: { type: string } & Record<string, unknown>): void => {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
  }

  connect()

  return {
    close: () => {
      closedByUser = true
      window.clearTimeout(timer)
      socket?.close()
    },
    subscribe: (id: string) => send({ type: 'subscribe', id }),
    unsubscribe: (id: string) => send({ type: 'unsubscribe', id }),
  }
}