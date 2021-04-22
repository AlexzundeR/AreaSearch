namespace Area.Search.Domain
{
    public struct Coordinates
    {
        public readonly double Lat;
        public readonly double Lng;

        public Coordinates(double lat, double lng)
        {
            Lat = lat;
            Lng = lng;
        }
    }
}