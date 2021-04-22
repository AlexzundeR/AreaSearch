using System;
using System.Collections.Generic;

namespace Area.Search.Domain
{
    public sealed class Route
    {
        public readonly long Id;
        public readonly string Name;
        public DateTime LastModificationDate;
        public readonly IReadOnlyCollection<RoutePoint> Points;

        public Route(long id, string name, DateTime lastModificationDate, IReadOnlyCollection<RoutePoint> points)
        {
            Id = id;
            Name = name;
            LastModificationDate = lastModificationDate;
            Points = points;
        }
    }
}