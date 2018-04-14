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

namespace Area.Search.DataGenerator
{
    class Program
    {
        static void Main(string[] args)
        {
            var csvFileName = "msk-names.csv";

            var csvReader = new CsvReader(new StreamReader(File.OpenRead(csvFileName)), new Configuration()
            {
                Encoding = Encoding.UTF8,
                IgnoreQuotes = true,
                HasHeaderRecord = false,
                Delimiter = "\t",
                CultureInfo = CultureInfo.InvariantCulture
            });

            var columns = new[] {
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
                "name",
                "add:full",
                "old_name" };

            var rawDatas = new List<MapRawData>();
            var result = true;
            var ignoreTypes = new List<string> { "traffic_signals", "speed_camera" };
            while (result)
            {
                result = csvReader.Read();

                if (!result)
                {
                    Console.WriteLine($"Break on {csvReader.Context.CurrentIndex} line");
                    break;
                }
                var rawData = new MapRawData();
                rawData.Id = csvReader.GetField(Array.IndexOf(columns, "@id"));
                rawData.Type = csvReader.GetField(Array.IndexOf(columns, "type"));
                rawData.Name = csvReader.GetField(Array.IndexOf(columns, "name"));
                rawData.FullAddr = csvReader.GetField(Array.IndexOf(columns, "add:full"));
                rawData.OldName = csvReader.GetField(Array.IndexOf(columns, "old_name"));
                rawData.Lon = csvReader.GetField<double>(Array.IndexOf(columns, "@lon"));
                rawData.Lat = csvReader.GetField<double>(Array.IndexOf(columns, "@lat"));
                rawData.Place = csvReader.GetField(Array.IndexOf(columns, "place"));
                rawData.Highway = csvReader.GetField(Array.IndexOf(columns, "highway"));
                rawData.Natural = csvReader.GetField(Array.IndexOf(columns, "natural"));
                rawData.Historic = csvReader.GetField(Array.IndexOf(columns, "historic"));
                rawData.Sport = csvReader.GetField(Array.IndexOf(columns, "sport"));
                rawData.Leisure = csvReader.GetField(Array.IndexOf(columns, "leisure"));
                rawData.PublicTransport = csvReader.GetField(Array.IndexOf(columns, "public_transport"));
                rawData.Railway = csvReader.GetField(Array.IndexOf(columns, "railway"));
                if (String.IsNullOrWhiteSpace(rawData.Name))
                {
                    rawData.Name = rawData.OldName;
                }
                if (rawData.IsAnyData() && !String.IsNullOrWhiteSpace(rawData.Name) && rawData.GetTypes().All(t => !ignoreTypes.Contains(t)))
                {
                    rawDatas.Add(rawData);
                }
            }

            var geoObjects = rawDatas.Where(d => d.IsPlace || d.IsNatural || d.IsHighway || d.IsStreet);
            var otherObjects = rawDatas.Where(d => d.IsLeisure || d.IsSport);
            var transportObjects = rawDatas.Where(d => d.IsRailWay || d.IsPublicTransport);
            var allObjects = rawDatas;

            var collections = new List<(string type, IEnumerable<MapRawData> collection)> { ("all", allObjects) };//, ("geo", geoObjects), ("other", otherObjects), ("transport", transportObjects) };

            foreach (var col in collections)
            {
                var collectionData = col.collection.GroupBy(e => e.Name).Select(e =>
                  {
                      var byType = e.SelectMany(d =>
                      {
                          var types = d.GetTypes();
                          var bigType = d.GetBigType();
                          return types.Select(dd => new { type = dd, bigType = d.GetBigType(), data = d });
                      });
                      var groupByType = byType.GroupBy(d => d.type);
                      var first = e.First();
                      var mapData = new MapData
                      {
                          Id = first.Id,
                          Name = String.IsNullOrWhiteSpace(first.Name) ? null : first.Name,
                          OldNames = String.Join(';', e.Where(d => !String.IsNullOrWhiteSpace(d.OldName)).Select(d => d.OldName)),
                          Data = groupByType.Select(d => new MapDataPoints
                          {
                              Type = d.Key,
                              BigType = d.FirstOrDefault()?.bigType,
                              Points = d.Select(p => new double[] { p.data.Lat, p.data.Lon })
                          }),
                      };
                      if (String.IsNullOrWhiteSpace(mapData.OldNames))
                      {
                          mapData.OldNames = null;
                      }
                      return mapData;
                  });

                var collectionString = JsonConvert.SerializeObject(collectionData, new JsonSerializerSettings
                {
                    NullValueHandling = NullValueHandling.Ignore,
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });

                File.WriteAllText($"{col.type}.json", collectionString);
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
            public bool IsPlace => !String.IsNullOrWhiteSpace(Place);
            public string Place { get; set; }
            public bool IsHighway => !String.IsNullOrWhiteSpace(Highway);
            public string Highway { get; set; }
            public bool IsNatural => !String.IsNullOrWhiteSpace(Natural);
            public string Natural { get; set; }
            public bool IsHistoric => !String.IsNullOrWhiteSpace(Historic);
            public string Historic { get; set; }
            public bool IsSport => !String.IsNullOrWhiteSpace(Sport);
            public string Sport { get; set; }
            public bool IsLeisure => !String.IsNullOrWhiteSpace(Leisure);
            public string Leisure { get; set; }
            public bool IsPublicTransport => !String.IsNullOrWhiteSpace(PublicTransport);
            public string PublicTransport { get; set; }
            public bool IsRailWay => !String.IsNullOrWhiteSpace(Railway);
            public string Railway { get; set; }
            public string Type { get; internal set; }

            public bool IsStreet => Type == "street";

            public bool IsAnyData()
            {
                return IsPlace || IsHighway || IsNatural || IsHistoric || IsSport || IsLeisure || IsPublicTransport || IsRailWay || IsStreet;
            }

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
                    yield return Highway;
                if (IsPlace)
                    yield return Place;
                if (IsNatural)
                    yield return Natural;
                if (IsHistoric)
                    yield return Historic;
                if (IsSport)
                    yield return Sport;
                if (IsLeisure)
                    yield return Leisure;
                if (IsPublicTransport)
                    yield return PublicTransport;
                if (IsRailWay)
                    yield return Railway;
                if (IsStreet)
                    yield return Type;
            }
        }
    }
}
