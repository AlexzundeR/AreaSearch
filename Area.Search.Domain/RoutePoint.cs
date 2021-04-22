namespace Area.Search.Domain
{
    public sealed class RoutePoint
    {
        public readonly string Name;
        public readonly string Description;
        public readonly Coordinates Coordinates;

        public RoutePoint(string name, string description, Coordinates coordinates)
        {
            Name = name;
            Description = description;
            Coordinates = coordinates;
        }
    }
}