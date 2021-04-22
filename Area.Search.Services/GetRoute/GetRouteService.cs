using System.Threading;
using System.Threading.Tasks;

using Area.Search.Domain;
using Area.Search.Repository;

namespace Area.Search.Services.GetRoute
{
    public sealed class GetRouteService
    {
        private readonly RouteRepository _routeRepository;

        public GetRouteService(RouteRepository routeRepository)
        {
            _routeRepository = routeRepository;
        }

        public async Task<Route> GetRoute(long routeId, CancellationToken cancellationToken)
        {
            Route route = await _routeRepository.GetRoute(routeId, cancellationToken);

            return route;
        }
    }
}