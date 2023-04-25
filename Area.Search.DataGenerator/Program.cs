using CsvHelper;
using CsvHelper.Configuration;

using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;

using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Area.Search.DataGenerator
{
    internal class Program
    {
        public const int Year = 2023;
        private static void Main(string[] args)
        {
            var csvFileName = $"msk-names-{Year}.csv";

            var csvReader = new CsvReader(
                new StreamReader(File.OpenRead(csvFileName)),
                new Configuration()
                {
                    Encoding = Encoding.UTF8,
                    IgnoreQuotes = true,
                    HasHeaderRecord = false,
                    Delimiter = "\t",
                    CultureInfo = CultureInfo.InvariantCulture
                });

            var columns = new[]
            {
                "@oname",
                "@id",
                "type",
                "@lon",
                "@lat",
                "place",
                "highway",
                "natural",
                "historic",
                "sport",
                "leisure",
                "public_transport",
                "railway",
                "tourism",
                "military",
                "man_made",
                "waterway",
                "amenity",
                "landuse",
                "building",
                "name",
                "add:full",
                "old_name"
            };

            var rawDatas = new List<MapRawData>();
            var result = true;
            var ignoreTypes = new List<string> { "traffic_signals", "speed_camera" };
            var count = 0;
            var progress = new Task(
                async () =>
                {
                    while (result)
                    {
                        Console.WriteLine(count);
                        await Task.Delay(1000);
                    }
                });
            progress.Start();

            while (result)
            {
                count++;
                result = csvReader.Read();

                if (!result)
                {
                    Console.WriteLine($"Break on {csvReader.Context.CurrentIndex} line");

                    break;
                }

                var rawData = new MapRawData
                {
                    Id = csvReader.GetField(Array.IndexOf(columns, "@id")),
                    Type = csvReader.GetField(Array.IndexOf(columns, "type")),
                    Name = csvReader.GetField(Array.IndexOf(columns, "name")),
                    FullAddr = csvReader.GetField(Array.IndexOf(columns, "add:full")),
                    OldName = csvReader.GetField(Array.IndexOf(columns, "old_name")),
                    Lon = csvReader.GetField<double>(Array.IndexOf(columns, "@lon")),
                    Lat = csvReader.GetField<double>(Array.IndexOf(columns, "@lat")),
                    Place = csvReader.GetField(Array.IndexOf(columns, "place")),
                    Highway = csvReader.GetField(Array.IndexOf(columns, "highway")),
                    Natural = csvReader.GetField(Array.IndexOf(columns, "natural")),
                    Historic = csvReader.GetField(Array.IndexOf(columns, "historic")),
                    Sport = csvReader.GetField(Array.IndexOf(columns, "sport")),
                    Leisure = csvReader.GetField(Array.IndexOf(columns, "leisure")),
                    PublicTransport = csvReader.GetField(Array.IndexOf(columns, "public_transport")),
                    Railway = csvReader.GetField(Array.IndexOf(columns, "railway")),
                    Tourism = csvReader.GetField(Array.IndexOf(columns, "tourism")),
                    Military = csvReader.GetField(Array.IndexOf(columns, "military")),
                    ManMade = csvReader.GetField(Array.IndexOf(columns, "man_made")),
                    Waterway = csvReader.GetField(Array.IndexOf(columns, "waterway")),
                    Amenity = csvReader.GetField(Array.IndexOf(columns, "amenity")),
                    Landuse = csvReader.GetField(Array.IndexOf(columns, "landuse")),
                    Building = csvReader.GetField(Array.IndexOf(columns, "building")),
                };

                if (string.IsNullOrWhiteSpace(rawData.Name))
                {
                    rawData.Name = rawData.OldName;
                }

                var types = rawData.GetTypes();

                if (

                    //rawData.IsAnyData() &&
                    !string.IsNullOrWhiteSpace(rawData.Name) &&
                    types.Any() &&
                    types.All(t => !ignoreTypes.Contains(t)))
                {
                    rawDatas.Add(rawData);
                }
            }

            var geoObjects = rawDatas.Where(d => d.IsPlace || d.IsNatural || d.IsHighway || d.IsStreet);
            var otherObjects = rawDatas.Where(d => d.IsLeisure || d.IsSport);
            var transportObjects = rawDatas.Where(d => d.IsRailWay || d.IsPublicTransport);
            var allObjects = rawDatas;

            var collections = new List<(string type, IEnumerable<MapRawData> collection)>
                { ("all", allObjects) }; //, ("geo", geoObjects), ("other", otherObjects), ("transport", transportObjects) };

            foreach (var col in collections)
            {
                var collectionData = col.collection.GroupBy(e => e.Name)
                    .Select(
                        e =>
                        {
                            var byType = e.SelectMany(
                                d =>
                                {
                                    var types = d.GetTypes();
                                    var bigType = d.GetBigType();

                                    return types.SelectMany(GetTypesParts).Select(dd => new { type = dd, bigType = d.GetBigType(), data = d });
                                });
                            var groupByType = byType.GroupBy(d => d.type);
                            var first = e.First();
                            var oldNames = string.Join(';', e.Where(d => !string.IsNullOrWhiteSpace(d.OldName)).Select(d => d.OldName).Distinct());
                            var mapData = new MapData
                            {
                                Id = first.Id,
                                Name = $"{(string.IsNullOrWhiteSpace(first.Name) ? null : first.Name)}{(String.IsNullOrWhiteSpace(oldNames) ? "" : $" ({oldNames})")}",
                                OldNames = String.Equals(oldNames, first.Name) ? "" : oldNames,
                                Data = groupByType.Select(
                                    d => new MapDataPoints
                                    {
                                        Type = d.Key,
                                        BigType = d.FirstOrDefault()?.bigType,
                                        Points = d.Select(p => new double[] { p.data.Lat, p.data.Lon })
                                    }),
                            };

                            if (string.IsNullOrWhiteSpace(mapData.OldNames))
                            {
                                mapData.OldNames = null;
                            }

                            return mapData;
                        })
                    .ToList();

                Console.WriteLine($"Total: {collectionData.Count}");

                int from = 0;
                int by = 10005000;
                int part = 1;

                while (true)
                {
                    var taken = collectionData.Skip(from).Take(by).ToList();

                    if (taken.Count == 0)
                    {
                        break;
                    }

                    var collectionString = JsonConvert.SerializeObject(
                        taken,
                        new JsonSerializerSettings
                        {
                            NullValueHandling = NullValueHandling.Ignore,
                            ContractResolver = new CamelCasePropertyNamesContractResolver()
                        });

                    File.WriteAllText($"{col.type}-{Year}-{part}.json", collectionString);

                    from += by;
                    part++;
                }

                var allTypes = collectionData.SelectMany(e => e.Data).SelectMany(GetTypesOfMapData).Distinct();

                var allTypesString = JsonConvert.SerializeObject(
                    allTypes,
                    new JsonSerializerSettings
                    {
                        NullValueHandling = NullValueHandling.Ignore,
                        ContractResolver = new CamelCasePropertyNamesContractResolver()
                    });
                File.WriteAllText($"{col.type}-types-{Year}.json", allTypesString);

                Console.ReadLine();
            }
        }

        public static IEnumerable<string> GetTypesOfMapData(MapDataPoints mapData)
        {
            yield return mapData.Type;
            yield return mapData.BigType;
        }

        public static IEnumerable<string> GetTypesParts(string typeString)
        {
            var parts = typeString?.Split(';', ',');

            foreach (var item in parts)
            {
                yield return item.Trim();
            }
        }

        public class MapData
        {
            public string Id { get; set; }
            public string Name { get; set; }
            public string OldNames { get; set; }
            public IEnumerable<MapDataPoints> Data { get; set; }
        }

        public class MapDataPoints
        {
            public string Type { get; set; }
            public IEnumerable<double[]> Points { get; set; }
            public string BigType { get; internal set; }
        }

        public class MapRawData
        {
            public string Id { get; set; }
            public string Name { get; set; }
            public string FullAddr { get; set; }
            public string OldName { get; set; }
            public double Lon { get; set; }
            public double Lat { get; set; }
            public bool IsPlace => !string.IsNullOrWhiteSpace(Place);
            public string Place { get; set; }
            public bool IsHighway => !string.IsNullOrWhiteSpace(Highway);
            public string Highway { get; set; }
            public bool IsNatural => !string.IsNullOrWhiteSpace(Natural);
            public string Natural { get; set; }
            public bool IsHistoric => !string.IsNullOrWhiteSpace(Historic);
            public string Historic { get; set; }
            public bool IsSport => !string.IsNullOrWhiteSpace(Sport);
            public string Sport { get; set; }
            public bool IsLeisure => !string.IsNullOrWhiteSpace(Leisure);
            public string Leisure { get; set; }
            public bool IsPublicTransport => !string.IsNullOrWhiteSpace(PublicTransport);
            public string PublicTransport { get; set; }
            public bool IsRailWay => !string.IsNullOrWhiteSpace(Railway);
            public string Railway { get; set; }
            public string Type { get; internal set; }

            public bool IsStreet => Type == "street";

            public bool IsTourism => !string.IsNullOrWhiteSpace(Tourism);
            public string Tourism { get; set; }
            public bool IsMilitary => !string.IsNullOrWhiteSpace(Military);
            public string Military { get; set; }
            public bool IsManMade => !string.IsNullOrWhiteSpace(ManMade);
            public string ManMade { get; set; }
            public bool IsWaterway => !string.IsNullOrWhiteSpace(Waterway);
            public string Waterway { get; set; }
            public bool IsAmenity => !string.IsNullOrWhiteSpace(Amenity);
            public string Amenity { get; set; }
            public bool IsLanduse => !string.IsNullOrWhiteSpace(Landuse);
            public string Landuse { get; set; }

            public bool IsBuilding => !string.IsNullOrWhiteSpace(Building);
            public string Building { get; set; }

            public string GetBigType()
            {
                if (IsPlace || IsNatural || IsHighway || IsStreet)
                {
                    return "geo";
                }

                if (IsRailWay || IsPublicTransport)
                {
                    return "transport";
                }

                return "other";
            }

            public IEnumerable<string> GetTypes()
            {
                if (IsHighway)
                {
                    yield return "highway";
                    yield return Highway;
                }

                if (IsPlace)
                {
                    yield return "place";
                    yield return Place;
                }

                if (IsNatural)
                {
                    yield return "natural";
                    yield return Natural;
                }

                if (IsHistoric)
                {
                    yield return "historic";
                    yield return Historic;
                }

                if (IsSport)
                {
                    yield return "sport";
                    yield return Sport;
                }

                if (IsLeisure)
                {
                    yield return "leisure";
                    yield return Leisure;
                }

                if (IsPublicTransport)
                {
                    yield return "transport";
                    yield return PublicTransport;
                }

                if (IsRailWay)
                {
                    yield return "railway";
                    yield return Railway;
                }

                if (IsTourism)
                {
                    yield return "tourism";
                    yield return Tourism;
                }

                if (IsMilitary)
                {
                    yield return "military";
                    yield return Military;
                }

                if (IsManMade)
                {
                    yield return "man_made";
                    yield return ManMade;
                }

                if (IsStreet)
                {
                    yield return "street";
                }

                if (IsWaterway)
                {
                    yield return "waterway";
                    yield return Waterway;
                }

                if (IsAmenity)
                {
                    yield return "amenity";
                    yield return Amenity;
                }

                if (IsLanduse)
                {
                    yield return "landuse";
                    yield return Landuse;
                }

                if (IsBuilding)
                {
                    yield return "building";
                    yield return Building;
                }

                if (Type != "multipolygon" &&
                    Type != "restriction" &&
                    Type != "boundaries" &&
                    !string.IsNullOrWhiteSpace(Type))
                {
                    yield return Type;
                }

                if (string.IsNullOrWhiteSpace(Type))
                {
                    yield return "notype";
                }
            }
        }
    }
}