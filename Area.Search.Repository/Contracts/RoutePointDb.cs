using System;

using Area.Search.Domain;

namespace Area.Search.Repository.Contracts
{
    internal sealed class RoutePointDb
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public CoordinatesDb Coordinates { get; set; }

        public static RoutePoint ToDomain(RoutePointDb point)
        {
            return new RoutePoint(point.Name, point.Description, new Coordinates(point.Coordinates.Lat, point.Coordinates.Lng));
        }

        public static RoutePointDb FromDomain(RoutePoint point)
        {
            return new RoutePointDb()
            {
                Name = point.Name,
                Description = point.Description,
                Coordinates = new CoordinatesDb()
                {
                    Lat = point.Coordinates.Lat,
                    Lng = point.Coordinates.Lng
                }
            };
        }
    }
}