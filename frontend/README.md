# Сайт Torrential

Лендинг на Next.js 15 (App Router) + TypeScript + Tailwind. Двуязычный: `/ru` и `/en`.

## Запуск

```bash
npm install          # один раз
npm run dev          # http://localhost:3000
npm run build        # статическая генерация /ru и /en
npm start            # предпросмотр сборки
```

Из корня репозитория то же самое: `npm run site:dev | site:build | site:start`.

## Переменные окружения

Скопируйте `.env.example` в `.env.local`:

| Переменная | Назначение |
| --- | --- |
| `SITE_URL` | Адрес сайта: мета-теги, `sitemap.xml`, `robots.txt`, canonical |
| `NEXT_PUBLIC_DOWNLOAD_BASE` | Папка с `.exe` (GitHub Releases, CDN, свой сервер) |
| `NEXT_PUBLIC_VERSION` | Версия в имени файлов сборок |

Установщики весят ~106 МБ каждый, поэтому они **не** лежат в `public/` — сборка сайта
остаётся лёгкой, а ссылки на скачивание собираются из `NEXT_PUBLIC_DOWNLOAD_BASE`
(см. `lib/downloads.ts`).

## Скриншоты

Изображения лежат в `public/screenshots/`:

| Файл | Что на кадре | Где используется |
| --- | --- | --- |
| `list.png` | список загрузок с живыми скоростями | первый экран и галерея |
| `files.png` | панель деталей с выбором файлов | галерея и OG-картинка (`public/og.png`) |
| `settings.png` | настройки, лимиты и язык | галерея |
| `settings-ru.png` | то же на русском | резервный кадр |

Чтобы заменить их своими, положите файлы с теми же именами в `public/screenshots/`
(либо переименуйте свои и поправьте `src` в `components/hero.tsx` и `components/gallery.tsx`).

Переснять автоматически можно одной командой из корня репозитория:

```bash
npm run screenshots
```

Скрипт `scripts/capture-screenshots.cjs` поднимает локальный трекер и сидер с демо-раздачами,
запускает движок Torrential, добавляет торренты и снимает четыре состояния окна.

## Структура

```
app/
  [locale]/
    layout.tsx     корневой layout: <html lang>, мета-теги, фон
    page.tsx       сам лендинг
    not-found.tsx  локализованная 404
  globals.css      база Tailwind + компоненты (.glass, .btn, .window-frame)
  robots.ts        robots.txt
  sitemap.ts       sitemap.xml с hreflang
components/        секции страницы (hero, features, gallery, tech, download, faq, footer)
lib/
  i18n.ts          словари ru/en и тип Dictionary
  downloads.ts     ссылки на сборки
middleware.ts      редирект «/» → «/ru»
```

Словари обязаны соответствовать интерфейсу `Dictionary` — забытый ключ ломает
`tsc`, а не продакшен.