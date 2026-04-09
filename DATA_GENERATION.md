# Инструкция по подготовке данных OSM для генератора

## Шаг 1: Скачивание PBF-файла Москвы

### Вариант 1: BBBike (рекомендуемый - меньше размер)
Скачать готовый PBF только для Москвы:
- URL: https://download.bbbike.org/osm/bbbike/Moscow/
- Файл: `moscow-*.osm.pbf` (~79 MB)
- Обновление: еженедельно

### Вариант 2: Geofabrik (Центральный федеральный округ)
Скачать ЦФО и затем обрезать:
- URL: https://download.geofabrik.de/russia/central-fed-district.html
- Файл: `central-fed-district-latest.osm.pbf` (~819 MB)

### Вариант 3: GIS-Lab (Россия целиком)
- URL: https://gis-lab.info/projects/osm_dump
- Файлы: https://gis-lab.info/projects/osm_dump/dump/latest/
- России: `russia-latest.osm.pbf` (~3.8 GB)

### Вариант 4: OpenStreetMap.fr
- URL: https://download.openstreetmap.fr/extracts/russia/
- Файл: `russia-latest.osm.pbf` (~4.2 GB)

### Вариант 5: Прямая ссылка (Russia)
```
https://download.geofabrik.de/russia-latest.osm.pbf
```

---

## Шаг 2: Конвертация PBF в CSV

Используется `osmconvert` для извлечения названий объектов.

### Скачивание osmconvert
- Windows: https://github.com/openstreetmap/osm2pgsql/releases (или искать osmconvert64.exe)
- Или использовать готовые сборки

### Команда конвертации
```powershell
.\osmconvert.exe .\moscow-2026.pbf --csv="@oname @id type @lon @lat place highway natural historic sport leisure public_transport railway tourism military man_made waterway amenity landuse building name add:full old_name" -o="msk-names-2026.csv" --all-to-nodes
```

### Параметры:
- `@oname` - оригинальное название
- `@id` - ID объекта
- `type` - тип объекта
- `@lon @lat` - координаты
- `place` - тип места (city, town, village, etc)
- `highway` - дороги
- `name`, `add:full`, `old_name` - названия

### Результат
Получится CSV-файл `msk-names-2026.csv` с колонками:
```
"@oname","@id","type","@lon","@lat","place","highway","natural","historic","sport","leisure","public_transport","railway","tourism","military","man_made","waterway","amenity","landuse","building","name","add:full","old_name"
```

---

## Шаг 3: Генерация JSON для приложения

### Использование DataGenerator

1. Переименуйте CSV-файл в `msk-names-2026.csv` (или измените год в коде)
2. Положите в папку `Area.Search.DataGenerator/`

### Изменение года

Если нужен другой год, измените константу в `Program.cs`:
```csharp
// Program.cs - строка 19
public const int Year = 2026;
```

Затем переименуйте входной файл соответственно:
```powershell
# Для Year = 2023
mv msk-names-2026.csv msk-names-2023.csv
```

### Запуск генератора
```powershell
cd Area.Search.DataGenerator
dotnet run
```

Генератор создаст файлы:
- `all-2026.json` - все названия
- `all-types-2026.json` - только типы объектов

---

## Готовые примеры

В проекте уже есть готовые данные:
- `ClientApp/app/static/all-2023.json`
- `ClientApp/app/static/all-types-2023.json`

---

## Ссылки

- BBBike Moscow: https://download.bbbike.org/osm/bbbike/Moscow/
- Geofabrik Russia: https://download.geofabrik.de/russia.html
- GIS-Lab: https://gis-lab.info/projects/osm_dump
- OSM Wiki: https://wiki.openstreetmap.org/wiki/RU:Planet.osm