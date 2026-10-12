/**
 * Ошибки API.
 *
 * Клиент показывает сообщение по коду (`code`) — так интерфейс может быть
 * на любом языке, а сервер не знает про это. Текст в `message` остаётся
 * как fallback для разработчика и для curl.
 */

export type ApiErrorCode =
  | 'bad_request'
  | 'invalid_magnet'
  | 'invalid_torrent_file'
  | 'invalid_source'
  | 'no_files'
  | 'torrent_not_found'
  | 'duplicate'
  | 'metadata_pending'
  | 'no_metadata'
  | 'unknown_action'
  | 'not_found'

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: ApiErrorCode = 'bad_request',
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export const badRequest = (message: string, code: ApiErrorCode = 'bad_request') =>
  new HttpError(400, message, code)

export const notFound = (message = 'Торрент не найден') =>
  new HttpError(404, message, 'torrent_not_found')

export const conflict = (message: string, code: ApiErrorCode = 'duplicate') =>
  new HttpError(409, message, code)