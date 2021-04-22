using System;
using System.Linq;

using Area.Search.Domain;

using Newtonsoft.Json;

namespace Area.Search.Repository.Contracts
{
    internal sealed class RouteDb
    {
        public long Id { get; set; }
        public string Name { get; set; }
        public DateTime LastModificationDate { get; set; }
        public string Points { get; set; }

        public static Route ToDomain(RouteDb route)
        {
            return new Route(
                route.Id,
                route.Name,
                route.LastModificationDate,
                (JsonConvert.DeserializeObject<RoutePointDb[]>(route.Points) ?? Array.Empty<RoutePointDb>()).Select(RoutePointDb.ToDomain).ToArray());
        }

        public static RouteDb FromDomain(Route route)
        {
            return new RouteDb
            {
                Id = route.Id,
                Name = route.Name,
                LastModificationDate = route.LastModificationDate,
                Points = JsonConvert.SerializeObject(route.Points.Select(RoutePointDb.FromDomain))
            };
        }
    }
}