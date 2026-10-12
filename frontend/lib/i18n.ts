/**
 * Контент лендинга на двух языках.
 *
 * Оба словаря обязаны соответствовать Dictionary, поэтому забытый
 * ключ ломает компиляцию, а не сборку сайта.
 */

export const locales = ['ru', 'en'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'ru'

export interface Dictionary {
  meta: { title: string; description: string; keywords: string }
  nav: { features: string; gallery: string; tech: string; download: string; faq: string; github: string }
  hero: {
    badge: string
    title: string
    subtitle: string
    primary: string
    secondary: string
    note: string
    stats: { value: string; label: string }[]
  }
  features: {
    title: string
    subtitle: string
    items: { title: string; text: string }[]
  }
  gallery: {
    title: string
    subtitle: string
    captions: { list: string; files: string; settings: string }
  }
  tech: {
    title: string
    subtitle: string
    items: { label: string; value: string }[]
  }
  download: {
    title: string
    subtitle: string
    installer: { title: string; text: string; meta: string }
    portable: { title: string; text: string; meta: string }
    requirements: string
    note: string
  }
  faq: {
    title: string
    items: { q: string; a: string }[]
  }
  footer: { tagline: string; product: string; project: string; rights: string; disclaimer: string }
  cta: { title: string; text: string; button: string }
}

export const ru: Dictionary = {
  meta: {
    title: 'Torrential — минималистичный десктопный торрент-клиент',
    description:
      'Torrential — быстрый и аккуратный BitTorrent-клиент для Windows: magnet и .torrent, выборочная загрузка файлов, пауза, лимиты скорости и восстановление сессии.',
    keywords:
      'торрент клиент, BitTorrent, magnet, скачать торрент, torrential, WebTorrent, Windows',
  },
  nav: {
    features: 'Возможности',
    gallery: 'Скриншоты',
    tech: 'Технологии',
    download: 'Скачать',
    faq: 'Вопросы',
    github: 'Исходный код',
  },
  hero: {
    badge: 'Windows · WebTorrent · Двуязычный',
    title: 'Торренты без лишнего шума',
    subtitle:
      'Torrential — минималистичный десктопный торрент-клиент. Никаких рекламных баннеров и вкладок: только список загрузок, честные скорости и выбор файлов в один клик.',
    primary: 'Скачать для Windows',
    secondary: 'Смотреть скриншоты',
    note: 'Бесплатно, без аккаунтов и телеметрии',
    stats: [
      { value: '400 мс', label: 'обновление интерфейса' },
      { value: '2', label: 'языка интерфейса' },
      { value: '0', label: 'рекламы и телеметрии' },
    ],
  },
  features: {
    title: 'Всё, что нужно, и ничего лишнего',
    subtitle: 'Шесть вещей, на которых держится весь клиент',
    items: [
      {
        title: 'Magnet и .torrent',
        text: 'Перетащите файл в окно или вставьте magnet через Ctrl+V — загрузка начинается сразу, без диалогов и подтверждений.',
      },
      {
        title: 'Выбор файлов',
        text: 'В многосерийных раздачах отметьте нужные файлы галочками — лишнее не скачивается и не занимает место.',
      },
      {
        title: 'Живое состояние',
        text: 'Скорости, остаток времени и число пиров обновляются каждые 400 мс по WebSocket — без перерисовки и задержек.',
      },
      {
        title: 'Пауза и проверка',
        text: 'Пауза действительно останавливает передачу, а «Проверка» пересчитывает хеши уже скачанных данных.',
      },
      {
        title: 'Лимиты скорости',
        text: 'Отдельные потолки на приём и отдачу, чтобы клиент не мешал другим приложениям в сети.',
      },
      {
        title: 'Сессия не теряется',
        text: 'После перезапуска торренты подхватываются автоматически, а данные на диске переиспользуются.',
      },
    ],
  },
  gallery: {
    title: 'Интерфейс',
    subtitle: 'Тёмная тема по умолчанию, стекломорфизм и плавные анимации',
    captions: {
      list: 'Список загрузок с живыми скоростями',
      files: 'Панель деталей и выбор файлов',
      settings: 'Настройки, лимиты и язык интерфейса',
    },
  },
  tech: {
    title: 'Под капотом',
    subtitle: 'Предсказуемый стек без лишних слоёв',
    items: [
      { label: 'Движок', value: 'WebTorrent 3 · Node.js' },
      { label: 'Интерфейс', value: 'React · TypeScript · Tailwind' },
      { label: 'Обновления', value: 'WebSocket, 400 мс' },
      { label: 'Оболочка', value: 'Electron · нативные окна' },
      { label: 'Сборка', value: 'NSIS · portable .exe' },
      { label: 'Зависимости в UI', value: 'только иконки и анимации' },
    ],
  },
  download: {
    title: 'Скачать Torrential',
    subtitle: 'Готовый .exe для Windows 10/11, 64-бит',
    installer: {
      title: 'Установщик',
      text: 'Обычная установка: ярлык на рабочем столе, папку можно выбрать в процессе.',
      meta: '106 МБ · Windows 10/11 x64',
    },
    portable: {
      title: 'Portable',
      text: 'Один файл без установки — запустил и работает, можно носить на флешке.',
      meta: '106 МБ · без установки',
    },
    requirements: 'Node.js не требуется: движок встроен в приложение.',
    note: 'Сборка воспроизводима из исходников одной командой npm run desktop:dist.',
  },
  faq: {
    title: 'Частые вопросы',
    items: [
      {
        q: 'Нужен ли Node.js?',
        a: 'Нет. В сборку .exe встроен весь движок на Node — приложение полностью автономно.',
      },
      {
        q: 'Как выбрать только нужные файлы?',
        a: 'Откройте торрент: справа появится панель со списком файлов. Отметьте нужные — клиент пересоберёт выборку кусков и продолжит загрузку.',
      },
      {
        q: 'Почему при выборе файлов скачивается лишнее?',
        a: 'BitTorrent работает с кусками, а не с файлами. Если файлы делят один кусок, он скачается целиком — это ограничение протокола, а не ошибка клиента.',
      },
      {
        q: 'Сохранятся ли торренты после перезапуска?',
        a: 'Да. Magnet-ссылки сохраняются локально, а уже скачанные данные остаются на диске и переиспользуются.',
      },
      {
        q: 'Есть ли русский язык?',
        a: 'Да, интерфейс полностью двуязычный. Язык выбирается в настройках и запоминается.',
      },
      {
        q: 'Отправляются ли мои данные куда-то?',
        a: 'Нет. Ни телеметрии, ни аккаунтов, ни внешних сервисов: клиент общается только с BitTorrent-сетью и с локальным диском.',
      },
    ],
  },
  footer: {
    tagline: 'Torrential — минималистичный десктопный торрент-клиент',
    product: 'Продукт',
    project: 'Проект',
    rights: 'Сделано с вниманием к деталям.',
    disclaimer:
      'Torrential — независимый клиент. Он не связан с авторами раздач и не распространяет контент.',
  },
  cta: {
    title: 'Готовы попробовать?',
    text: 'Один файл — и торренты снова выглядят спокойно.',
    button: 'Скачать для Windows',
  },
}

export const en: Dictionary = {
  meta: {
    title: 'Torrential — minimalistic desktop torrent client',
    description:
      'Torrential is a fast, tidy BitTorrent client for Windows: magnet links and .torrent files, per-file selection, pause, speed limits and session restore.',
    keywords: 'torrent client, BitTorrent, magnet, download torrents, torrential, WebTorrent, Windows',
  },
  nav: {
    features: 'Features',
    gallery: 'Screenshots',
    tech: 'Tech',
    download: 'Download',
    faq: 'FAQ',
    github: 'Source code',
  },
  hero: {
    badge: 'Windows · WebTorrent · Bilingual',
    title: 'Torrents without the noise',
    subtitle:
      'Torrential is a minimalistic desktop torrent client. No ad banners, no tab soup — just your downloads, honest speeds and per-file selection in one click.',
    primary: 'Download for Windows',
    secondary: 'See the screenshots',
    note: 'Free, no accounts, no telemetry',
    stats: [
      { value: '400 ms', label: 'interface updates' },
      { value: '2', label: 'interface languages' },
      { value: '0', label: 'ads and telemetry' },
    ],
  },
  features: {
    title: 'Everything needed, nothing more',
    subtitle: 'Six things the whole client is built around',
    items: [
      {
        title: 'Magnet and .torrent',
        text: 'Drop a file into the window or paste a magnet with Ctrl+V — the download starts immediately, without dialogs and confirmations.',
      },
      {
        title: 'Per-file selection',
        text: 'In multi-file torrents tick the files you need — the rest is never downloaded and never takes up space.',
      },
      {
        title: 'Live state',
        text: 'Speeds, remaining time and peer count refresh every 400 ms over WebSocket — no repaint jank, no lag.',
      },
      {
        title: 'Pause and verify',
        text: 'Pause genuinely stops the transfer, and Verify re-hashes the data you already downloaded.',
      },
      {
        title: 'Speed limits',
        text: 'Separate ceilings for download and upload so the client never competes with the rest of your network.',
      },
      {
        title: 'Sessions survive',
        text: 'After a restart torrents come back automatically, and the data already on disk is reused.',
      },
    ],
  },
  gallery: {
    title: 'The interface',
    subtitle: 'Dark by default, glassmorphism and smooth motion',
    captions: {
      list: 'Download list with live speeds',
      files: 'Details panel and file selection',
      settings: 'Settings, limits and interface language',
    },
  },
  tech: {
    title: 'Under the hood',
    subtitle: 'A predictable stack with no extra layers',
    items: [
      { label: 'Engine', value: 'WebTorrent 3 · Node.js' },
      { label: 'Interface', value: 'React · TypeScript · Tailwind' },
      { label: 'Updates', value: 'WebSocket, 400 ms' },
      { label: 'Shell', value: 'Electron · native windows' },
      { label: 'Packaging', value: 'NSIS · portable .exe' },
      { label: 'UI dependencies', value: 'icons and animations only' },
    ],
  },
  download: {
    title: 'Download Torrential',
    subtitle: 'A ready-to-run .exe for Windows 10/11, 64-bit',
    installer: {
      title: 'Installer',
      text: 'Regular installation: desktop shortcut, and you can pick the folder during setup.',
      meta: '106 MB · Windows 10/11 x64',
    },
    portable: {
      title: 'Portable',
      text: 'A single file with no installation — run it and go, it fits on a USB stick.',
      meta: '106 MB · no installation',
    },
    requirements: 'Node.js is not required: the engine ships inside the app.',
    note: 'The build is reproducible from source with a single npm run desktop:dist.',
  },
  faq: {
    title: 'Frequently asked',
    items: [
      {
        q: 'Do I need Node.js?',
        a: 'No. The entire Node engine is bundled into the .exe — the app is fully self-contained.',
      },
      {
        q: 'How do I pick only some files?',
        a: 'Open the torrent: a panel with the file list opens on the right. Tick what you need and the client rebuilds the piece selection.',
      },
      {
        q: 'Why does file selection still download extra data?',
        a: 'BitTorrent works with pieces, not files. When files share a piece, that piece is downloaded whole — a protocol limitation, not a client bug.',
      },
      {
        q: 'Will my torrents survive a restart?',
        a: 'Yes. Magnet links are stored locally and the data already on disk is reused.',
      },
      {
        q: 'Is there a Russian interface?',
        a: 'Yes, the interface is fully bilingual. Pick the language in settings — the choice is remembered.',
      },
      {
        q: 'Is any of my data sent anywhere?',
        a: 'No. No telemetry, no accounts, no external services — the client talks to the BitTorrent swarm and your disk, nothing else.',
      },
    ],
  },
  footer: {
    tagline: 'Torrential — minimalistic desktop torrent client',
    product: 'Product',
    project: 'Project',
    rights: 'Built with attention to detail.',
    disclaimer:
      'Torrential is an independent client. It is not affiliated with torrent authors and distributes no content.',
  },
  cta: {
    title: 'Ready to try?',
    text: 'One file — and torrents look calm again.',
    button: 'Download for Windows',
  },
}

const dictionaries: Record<Locale, Dictionary> = { ru, en }

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale)
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale]
}