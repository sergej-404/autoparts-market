# AXION X 9.14.8 — исправление ESLint

## Исправления

- Устранены три ошибки `react-hooks/purity` в `app/(home)/page.tsx`: вызовы `performance.now()` вынесены из React-компонента в отдельный модуль `lib/performance-diagnostics.ts`.
- Сохранена функциональность диагностики производительности `AXION_PERFORMANCE_DIAGNOSTICS=true`, включая события `home.categories_cache`, `home.popular_listings_cache`, `home.makes_cache` и `home.data_ready`.
- Удалена неиспользуемая переменная `cartKey` в `app/favorites/FavoritesClient.tsx`.
- `readCounts` в `components/layout/Header.tsx` обёрнут в `useCallback`, а его зависимость добавлена в массив зависимостей эффекта.

## Проверки

- Синтаксическая транспиляция TypeScript/TSX для четырёх изменённых файлов прошла.
- Полный `npm run lint`, `npm run type-check` и `npm run build` в среде подготовки не выполнены: установка зависимостей повторно превысила лимит времени.
- По предоставленному журналу пользователя `npm ci` и `npm run type-check` в его окружении ранее завершились успешно; исходный `npm run lint` завершился с тремя ошибками и 33 предупреждениями.

После распаковки выполнить `npm run lint`, затем `npm run type-check` и `npm run build`.
